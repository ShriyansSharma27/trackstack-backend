const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const database = require('better-sqlite3');
const mongoose = require('mongoose');

const db = new database('users.db');
db.exec("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, password TEXT)");

// use Sequelize for ORM model inclusion on resume

const FinanceSchema = new mongoose.Schema({
    username: String,
    incomes: Array,
    payments: Array,
    processed: Array,
    netbalance: Number,
    targets: Array,
})
const Finance = mongoose.model('Finance', FinanceSchema); 

const connect = async() => {
    await mongoose.connect('mongodb://localhost:27017/admin');
}

connect();

router.post("/signup", async (req,res) => {
    let {username, password} = req.body;
    username = username.toLowerCase();

    const stmt = db.prepare("SELECT * FROM USERS WHERE username = ?");
    const users = stmt.all(username);
    if(users.length > 0) {
        return res.status(409).json({"message": "conflict"});
    }
    const hashedpswd = await bcrypt.hash(password, 10);
    const add = db.prepare("INSERT INTO users (username, password) VALUES (? , ?)");
    add.run(username, hashedpswd);
    const store_finance = new Finance({username: username, incomes: [], payments: []});
    await store_finance.save();
    req.session.user = username;
    return res.status(201).json({"success": "created"});
})

router.post("/login", async(req,res) => {
    let {username, password} = req.body;
    username = username.toLowerCase();

    const user = db.prepare("SELECT * FROM users WHERE username = ?");
    const exc = user.get(username);

    if(!exc) {
        return res.status(404).json({"message": "user not found"});
    }

    if(await bcrypt.compare(password ,exc.password)) {
        req.session.user = username;
        let grab_inc = await Finance.findOne(details => details.username === username);
        grab_inc = grab_inc.incomes;
        let grab_pay = await Finance.findOne(details => details.username === username);
        grab_pay = grab_pay.payments;
        return res.status(200).json({"success": "logged in", "income": JSON.stringify(grab_inc),
            "payments": JSON.stringify(grab_pay)
        });
    }
    return res.status(404).json({"message": "incorrect password"});
})

router.post("/api/income/:username/:choice", async(req,res) => {
    const grab_finance = await Finance.findOne({username: req.params.username});
    if(req.params.choice == 1) {
        await Finance.findOneAndUpdate({username: req.params.username}, {incomes: [...grab_finance.incomes, req.body]});
    } //add an income
    else if(req.params.choice == 2) {
        const incms = grab_finance.incomes;
        const rest_incms = incms.filter(icm => icm.title !== req.body.title);
        await Finance.findOneAndUpdate({username: req.params.username}, {incomes: [...rest_incms, req.body]}) 
    } //edit an income
    else {
        const filter_icms = grab_finance.incomes.filter(icm => icm.title !== req.body.title);
        await Finance.findOneAndUpdate({username: req.params.username}, {incomes: filter_icms});
    } //del an income
})

router.post("/api/pay/:username/:choice", async(req,res) => {
    const grab_finance = await Finance.findOne({username: req.params.username});
    if(req.params.choice == 1) {
        await Finance.findOneAndUpdate({username: req.params.username}, {payments: [grab_finance, req.body]});
    } //add a payment
    else if(req.params.choice == 2) {
        const pyms = grab_finance.payments;
        const rest_payms = pyms.filter(icm => icm.title !== req.body.title);
        await Finance.findOneAndUpdate({username: req.params.username}, {payments: [...rest_payms, req.body]}) 
    } //edit a payment
    else {
        const filter_pyms = grab_finance.incomes.filter(pym => pym.title !== req.body.title);
        await Finance.findOneAndUpdate({username: req.params.username}, {payments: filter_pyms});
    } //del a payment
}) 

{/*Tested above api endpoints*/}
{/*
router.post("/api/categories/:user/:choice", async(req,res) => {
    const grab_details = await Finance.findOne({user: req.params.username})
    if(req.params.choice == 1) {
        let total = 0;
        const categories = {"salary": 0, "freelance": 0, "business": 0, "stocks": 0, "investments": 0,
            "rental": 0, "pension": 0, "governmental": 0, "scholarships": 0, "miscellaneous": 0
        }
        const percents = {"salary": 0, "freelance": 0, "business": 0, "stocks": 0, "investments": 0,
            "rental": 0, "pension": 0, "governmental": 0, "scholarships": 0, "miscellaneous": 0
        }
        for(let i = 0; i < grab_details.incomes.length; i++) {
            const option = grab_details.incomes[i].category;
            categories[option] += Number(grab_details.incomes[i].income);
            total += Number(grab_details.incomes[i]);
        }

        for(let percent in percents) {
           percents[percent] = Math.round((categories[percent] / total) * 100);
        }
        return res.status(201).json({"incomes": categories, "percents": percents});
    }
    else {
        let total = 0;
        const categories = {"housing": 0, "utilities": 0, "transportation": 0, "groceries": 0,
            "healthcare": 0, "insurance": 0, "debt": 0, "education": 0, "tax": 0, "other": 0
        }
        const percents = {"housing": 0, "utilities": 0, "transportation": 0, "groceries": 0,
            "healthcare": 0, "insurance": 0, "debt": 0, "education": 0, "tax": 0, "other": 0
        }
        for(let i = 0; i < grab_details.payments.length; i++) {
            const option = grab_details.payments[i].category;
            categories[option] += Number(grab_details.payments[i].payment);
            total += Number(grab_details.payments[i].payment);
        }

        for(let percent in percents) {
            percents[percent] = Math.round((categories[percent] / total) * 100);
        }

        return res.status(201).json({"payments": categories, "percents": percents});
    }
})
    */}

router.post("/api/savings/tally/:user", async(req,res) => {
    const grab_gain = await Finance.findOne({username: req.params.username});
    let curr_dt = new Date();
    curr_dt = format(curr_dt, 'MM/dd/yyyy');
    for(let i = 0; i < grab_gain.incomes.length; i++){
        grab_gain.netbalance += Number(grab_gain.incomes[i].income);
        const dte = grab_gain[i].date;
        const recur = grab_gain[i].recurring;
        if(dte === curr_dt && !grab_gain[i].exec) {
            grab_gain.netbalance += Number(grab_gain.incomes[i].income);
            grab_gain.processing.push({...grab_gain.incomes[i], "type": "income"});
            grab_gain[i].exec = true; //for checking if its recurring or not
        }
        else {
            const grab_mntly = dte.slice(dte.indexOf('/'));
            const grab_yrly = dte.slice(dte.lastIndexOf('/'));

            if(grab_mntly === curr_dt.slice(curr_dt.indexOf('/')) && recur === 'monthly' && (grab_mntly.getTime() - curr_dt > 0)) {
                grab_gain.netbalance += Number(grab_gain.incomes[i].income);
            } //monthly recurring
            
            if(grab_yrly === curr_dt.slice(curr_dt.lastIndexOf('/')) && recur === 'yearly' && (grab_mntly.getTime() - curr_dt > 0)) {
                grab_deduct.netbalance += Number(grab_gain.incomes[i].income);
            } //yearly recurring
        }
    }
})

{/* 
    Date handling (overflow)
    Design allows re processing of payments (overprocessing)
    soln. - handle the payment processing by including year and month 
    (can be same after an year so handle that)
    (can be diff after an year)
    -- addition of the processed payments to the processed in order to display
    -- 
*/}

{/*
router.post("/api/savings/deduct/:user", async(req,res) => {
    const grab_deduct =  await Finance.findOne({username: req.params.username});
    let curr_dt = new Date();
    curr_dt = format(curr_dt, 'MM/dd/yyyy');

    for(let i = 0; i < grab_deduct.payments.length; i++) {
        const dte = grab_deduct[i].date;
        const recur = grab_deduct[i].recurring;
        if(dte === curr_dt && !grab_deduct[i].exec) {
            grab_deduct.netbalance -= Number(grab_deduct.payments[i].payment);
            grab_deduct[i].exec = true; //for checking if its recurring or not
        }
        else {
            const grab_dt = dte.slice(dte.indexOf('/'));
            const grab_dt1 = dte.slice(dte.lastIndexOf('/'));
            if(grab_dt === curr_dt.slice(curr_dt.indexOf('/')) && recur === 'monthly') {
                grab_deduct.netbalance -= Number(grab_deduct.payments[i].payment);
            }
            
            if(grab_dt1 === curr_dt.slice(curr_dt.lastIndexOf('/')) && recur === 'yearly') {
                grab_deduct.netbalance -= Number(grab_deduct.payments[i].payment);
            }
        }
    } 
})
    */}

router.post("/api/tracker/savings/:user", async(req,res) => {

})

router.post("/logout", async(req,res) => {
    req.session.destroy((err) => {
        if(err) {
            return res.status(500).json({"message": "failed"});
        }
        
    });
})


module.exports = router;