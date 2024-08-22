const express = require('express');
const router = express.Router();
const {Sequelize, DataTypes, Op} = require('sequelize');
const path = require('path');
const {defineInventory} = require(path.join(__dirname, '..', '/middleware/model.js'));
const {v4: uuid} = require('uuid');
const fs = require('fs');
const {jsPDF} = require('jspdf');
const format = require('date-fns');

router.get("/api/grab/item/:user/:item", async(req,res) => {
    try {
        await connect_to_db.authenticate();
        const connect_to_db = new Sequelize({
            dialect: 'sqlite',
            storage: path.join(__dirname, '..', `/databases/${req.params.user}.db`)
        });
        const Inventory = defineInventory(connect_to_db);
        const find_item = await Inventory.findOne({
            where: {
                item: req.body.item
            },
        });
        if(!find_item) {
            return res.status(200).json({"message": "no such item found"});
        }
        res.status(200).json({"success": "modified item"});
    }
    catch(err) {
        console.log('Unable to connect to database: ' + err.message);
    }
})

router.post("/api/add/item/:user", async(req,res) => {
    const filename = path.join(__dirname, '..', `/inventory_history/restocks/${username}_tracker.txt`);
    const date = new Date();
    fs.readFile(filename, 'utf8', (err,data) => {
        if(err) {
            return res.status(500).json({"message": "Internval Server Error"});
        }
        
        if(data.slice(-2) === '-') {
            fs.appendFile(filename, `${req.body.item}\t\tStocked ${stocks} units\t\t{format(date, 'MM/dd/yyyy HH:mm')}` , err => {
                if(err) {
                    return res.status(500).json({"message": "Internal Server Error"});
                }
            })
            }
        }
    );

    if(data.slice(-2) !== '-') {
        fs.appendFile(filename, `${req.body.item}\t\tRestocked ${stocks} units\t\t{format(date, 'MM/dd/yyyy HH:mm')}` , err => {
            if(err) {
                return res.status(500).json({"message": "Internal Server Error"});
            }
        }
        )
    }

    try {
        await connect_to_db.authenticate();
        const connect_to_db = new Sequelize({
            dialect: 'sqlite',
            storage: path.join(__dirname, '..', `/databases/${req.params.user}.db`)
        });
        
        const Inventory = defineInventory(connect_to_db);
        const check = Inventory.findAll({
            where: {
                item: req.body.item
            },
        });
        if(check.length > 0) {
            return res.status(401).json({"message": "item already exists"});
        }
        await Inventory.create({item: req.body.item, desc: req.body.desc, price: parseFloat(req.body.price), SKU: req.body.SKU, stock: Number(req.body.stock)});
        res.status(200).json({"success": "added item"});
    }
    catch (err) {
        console.log('Unable to connect to database: ' + err.message);
    }
})

router.delete("/api/remove/item/:user", async(req,res) => {
    try {
        await connect_to_db.authenticate();
        const connect_to_db = new Sequelize({
            dialect: 'sqlite',
            storage: path.join(__dirname, '..', `/databases/${req.params.user}.db`)
        });
        const Inventory = defineInventory(connect_to_db);
        await Inventory.destroy({
            where: {
                item: req.body.item,
            },
        });
        res.status(200).json({"success": "deleted item"});
    }
    catch(err) {
        console.log('Unable to connect to database: ' + err.message);
    }
})

router.put("/api/modify/item/:user", async(req,res) => {
    try {
        await connect_to_db.authenticate();
        const connect_to_db = new Sequelize({
            dialect: 'sqlite',
            storage: path.join(__dirname, '..', `/databases/${req.params.user}.db`)
        });
        const Inventory = defineInventory(connect_to_db);
        await Inventory.update(
            req.body,
            {
                where: {
                    item: req.body.item
                }
            }
        )
        res.status(200).json({"success": "modified item"});
    }
    catch(err) {
        console.log('Unable to connect to database: ' + err.message);
    }
})

router.put("/api/update/sales/:user", async(req,res) => {
    try {
        await connect_to_db.authenticate();
        const connect_to_db = new Sequelize({
            dialect: 'sqlite',
            storage: path.join(__dirname, '..', `/databases/${req.params.user}.db`)
        });
        const Inventory = defineInventory(connect_to_db);
        await Inventory.update(
            {stock: req.body.stock},
            {
                where: {
                    item: req.body.item
                }
            }
        );
        const itm = Inventory.findOne({
            where: {
                item: req.body.item
            }
        })

        const sold = itm.stock - req.body.stock;
        const val_sold = sold * itm.price;
        const filename = path.join(__dirname, '..', `/inventory_history/restocks/${username}_tracker.txt`);
        const date = new Date();
        fs.appendFile(filename, `${req.body.item}\t\tSold ${stocks} units\t\tEarned ${val_sold}\t\t{format(date, 'MM/dd/yyyy HH:mm')}` , err => {
            if(err) {
                return res.status(500).json({"message": "Internal Server Error"});
            }
        });

        res.status(200).json({"success": "updated stocks"});
    }
        
    catch(err) {
        console.log('Unable to connect to database: ' + err.message);
    }
})

router.get("/api/check/low/:user/", async(req,res) => {
    try {
        await connect_to_db.authenticate();
        const connect_to_db = new Sequelize({
            dialect: 'sqlite',
            storage: path.join(__dirname, '..', `/databases/${req.params.user}.db`)
        });
        const Inventory = defineInventory(connect_to_db);
        const find_items = await Inventory.findAll({
            where: {
                item: {
                    [Op.lte]: 40, 
                },
            },
        });
        if(find_items.length > 0) {
            return res.status(200).json({"items low": JSON.stringify(find_items.map(itm => itm.title))});
        }
        res.status(200).json({"items low": "none"});
    }
    catch(err) {
        console.log('Unable to connect to database: ' + err.message);
    }
})  


router.get("/api/inventory/gen/pdf/:user", async(req,res) => {
    const filename = path.join(__dirname, '..', `/inventory_history/${req.params.user}.txt`);
    const doc = new jsPDF();
    fs.readFile(filename, 'utf8', (err,data) => {
        if(err) {
            console.error('Error reading file: ' + err.message);
            return res.status(500).json({ "message": "Internal Server Error" });
        }
    });

    doc.text(data);
    doc.save("Inventory_Statistics.pdf");

    res.sendFile(doc);
})

router.get("/api/report/reorders/gen/:user", async(req,res) => {
    const filename = path.join(__dirname, '..', `/inventory_history/reorders/${req.params.user}.txt`);
    fs.readFile(filename, 'utf8', (err,data) => {
        if(err) {
            console.error('Error reading file: ' + err.message);
            return res.status(500).json({ "message": "Internal Server Error" });
        }
        res.setHeader('Content-Disposition', `attachment; filename="${req.params.user}.txt"`);
        res.setHeader('Content-Type', 'text/plain');
        // Send the file content
        res.send(data);
    }); 
})

router.get("/api/report/sales/gen/:user", async(req,res) => {
    const filename = path.join(__dirname, '..', `/inventory_history/sales/${req.params.user}.txt`);
    fs.readFile(filename, 'utf8', (err,data) => {
        if(err) {
            console.error('Error reading file: ' + err.message);
            return res.status(500).json({ "message": "Internal Server Error" });
        }
        res.setHeader('Content-Disposition', `attachment; filename="${req.params.user}.txt"`);
        res.setHeader('Content-Type', 'text/plain');
        // Send the file content
        res.send(data);
    }); 
})


module.exports = router;