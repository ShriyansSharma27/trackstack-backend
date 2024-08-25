const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const path = require('path');
const { defineInventory, connectDb } = require(path.join(__dirname, '..', '/middleware/model.js'));
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const {Parser} = require('json2csv');
const { format } = require('date-fns');
const date = new Date();

router.get("/api/grab/db/:user", async(req,res) => {
    try {
        const connect_to_db = await connectDb(req);
        const Inventory = defineInventory(connect_to_db);
        await Inventory.sync();
        const data = await Inventory.findAll();
        return res.json(data);
    }
    catch (err) {
        console.log('Unable to connect to database: ' + err.message);
    }
})

router.get("/api/grab/item/:user", async (req, res) => {
    try {
        const connect_to_db = await connectDb(req);
        const Inventory = defineInventory(connect_to_db);
        await Inventory.sync();
        const find_item = await Inventory.findOne({
            where: {
                SKU: req.body.SKU
            },
        });
        if (!find_item) {
            return res.status(200).json({ "message": "no such item found" });
        }
        res.status(200).json({ "success": "found item", "item": JSON.stringify(find_item) });
    }
    catch (err) {
        console.log('Unable to connect to database: ' + err.message);
    }
})

router.post("/api/add/item/:user", async (req, res) => {
    const filename = path.join(__dirname, '..', `/inventory_history/restocks/${req.params.user}_tracker.txt`);

    try {
        const Inventory = defineInventory(await connectDb(req));
        await Inventory.create({ item: req.body.item, desc: req.body.desc, price: parseFloat(req.body.price), SKU: req.body.SKU, stock: Number(req.body.stock) });
        const data = `${req.body.item}\t\tStocked ${req.body.stock} units\t\t${format(date, 'MM/dd/yyyy HH:mm')}\t\t${uuidv4()}\n`;
        fs.appendFile(filename, data, function (err) {
            if (err) {
                return res.status(500).json({ "message": "Internal Server Error" });
            }
        })
        return res.status(200).json({ "success": "added item" });
    }
    catch (err) {
        console.log(err.message);
    }
})

router.delete("/api/remove/item/:user", async (req, res) => {
    const filename = path.join(__dirname, '..', `/inventory_history/remitems/${req.params.user}_tracker.txt`);

    try {
        const Inventory = defineInventory(await connectDb(req));
        const data = `${req.body.item}\t\t${format(date, 'MM/dd/yyyy HH:mm')}\t\t${uuidv4()}\n`;
        fs.appendFile(filename, data, function (err) {
            if (err) {
                return res.status(500).json({ "message": "Internal Server Error" });
            }
        })
        await Inventory.destroy({
            where: {
                SKU: req.body.SKU,
            },
        });
        res.status(200).json({ "success": "deleted item" });
    }
    catch (err) {
        console.log('Unable to connect to database: ' + err.message);
    }
})

router.put("/api/modify/item/:user", async (req, res) => {
    try {
        const Inventory = defineInventory(await connectDb(req));
        await Inventory.update(
            req.body,
            {
                where: {
                    SKU: req.body.SKU,
                }
            }
        )
        res.status(200).json({ "success": "modified item" });
    }
    catch (err) {
        console.log('Unable to connect to database: ' + err.message);
    }
})

router.put("/api/update/stock/:user", async (req, res) => {
    try {
        const Inventory = defineInventory(await connectDb(req));
        const itm = await Inventory.findOne({
            where: {
                SKU: req.body.SKU,
            }
        })

        await Inventory.update(
            { stock: req.body.stock },
            {
                where: {
                    SKU: req.body.SKU,
                }
            }
        );

        const sold = itm.stock - req.body.stock;
        if (sold > 0) {
            const val_sold = sold * itm.price;
            const filename = path.join(__dirname, '..', `/inventory_history/sales/${req.params.user}_tracker.txt`);
            const date = new Date();
            fs.appendFile(filename, `${itm.item}\t\tSold ${sold} units\t\tSold amount of ${val_sold}\t\t${format(date, 'MM/dd/yyyy HH:mm')}\t\t${uuidv4()}`, err => {
                if (err) {
                    return res.status(500).json({ "message": "Internal Server Error" });
                }
            });
        }
        else {
            const filename = path.join(__dirname, '..', `/inventory_history/restocks/${req.params.user}_tracker.txt`);
            const date = new Date();
            fs.appendFile(filename, `${itm.item}\t\tRestocked ${req.body.stock} units\t\t${format(date, 'MM/dd/yyyy HH:mm')}\t\t${uuidv4()}`, err => {
                if (err) {
                    return res.status(500).json({ "message": "Internal Server Error" });
                }
            });
        }

        res.status(200).json({ "success": "updated stocks" });
    }

    catch (err) {
        console.log('Unable to connect to database: ' + err.message);
    }
})

router.get("/api/check/low/:user/:lowlimit", async (req, res) => {
    try {
        const Inventory = defineInventory(await connectDb(req));
        
        const find_items = await Inventory.findAll({
            where: {
                stock: {
                    [Op.lte]: req.params.lowlimit,
                },
            },
        });
        const extract = find_items.map(({item, SKU, stock}) => ({item, SKU, stock}));
        if (find_items.length > 0) { 
            return res.status(200).json({ "items low": extract});
        }
        res.status(200).json({ "items low": "none" });
    }
    catch (err) {
        console.log('Unable to connect to database: ' + err.message);
    }
}) //static reorder points



//pdf/csv files generator
router.get("/api/inventory/data/:user", async(req,res) => {
    const Inventory = defineInventory(await connectDb(req));
    const grab_data = await Inventory.findAll({
        attributes: ['item', 'desc', 'SKU', 'stock', 'price']
    });
    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(grab_data);
    
    res.header('Content-Type', 'text/csv');
    res.attachment('inventory.csv');
    res.send(csv);
})  

router.get("/api/restocks/gen/:user", async (req, res) => {
    const filename = path.join(__dirname, '..', `/inventory_history/restocks/${req.params.user}_tracker.txt`);
    fs.readFile(filename, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading file: ' + err.message);
            return res.status(500).json({ "message": "Internal Server Error" });
        }
        res.setHeader('Content-Disposition', `attachment; filename="${req.params.user}.txt"`);
        res.setHeader('Content-Type', 'text/plain');
        // Send the file content
        res.send(data);
    })
})

router.get("/api/sales/gen/:user", async (req, res) => {
    const filename = path.join(__dirname, '..', `/inventory_history/sales/${req.params.user}_tracker.txt`);
    fs.readFile(filename, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading file: ' + err.message);
            return res.status(500).json({ "message": "Internal Server Error" });
        }
        res.setHeader('Content-Disposition', `attachment; filename="${req.params.user}.txt"`);
        res.setHeader('Content-Type', 'text/plain');
        // Send the file content
        res.send(data);
    });
})

router.get("/api/removed/gen/:user", async (req, res) => {
    const filename = path.join(__dirname, '..', `/inventory_history/remitems/${req.params.user}_tracker.txt`);
    fs.readFile(filename, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading file: ' + err.message);
            return res.status(500).json({ "message": "Internal Server Error" });
        }
        res.setHeader('Content-Disposition', `attachment; filename="${req.params.user}.txt"`);
        res.setHeader('Content-Type', 'text/plain');

        res.send(data);
    });
})
    
module.exports = router;