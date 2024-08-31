const express = require('express');
const router = express.Router();
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const { format } = require('date-fns');
const { Parser } = require('json2csv');

const { defineInventory, connectDb } = require(path.join(__dirname, '..', '/middleware/model.js'))
const { Op } = require('sequelize');


router.get("/api/grab/db/:user", async (req, res) => {
    try {
        const Inventory = defineInventory(await connectDb(req));
        const data = await Inventory.findAll();
        return res.json(data);
    }
    catch (err) {
        return res.status(500).json({ error: "Internal Server Error" });
    }
}) //read the database using user params and send back data

router.post("/api/read/csv/:user", async (req, res) => {
    try {
        const Inventory = defineInventory(await connectDb(req));
        fs.createReadStream(req.file)
            .pipe(fastcsv.parse({ headers: true }))
            .on('data', async (row) => {
                await Inventory.create(row);
            })
            .on('end', () => {
                return res.status(200).json({ "success": "parsed csv file" });
            })
            .on('error', (err) => {
                console.error('Error while parsing the CSV file:', err.message);
                return res.status(500).json({ error: "Failed to parse CSV file" });
            });
    }
    catch (err) {
        return res.status(500).json({ error: "Internal Server Error" });
    }
}) //read a csv file to store the contents in inventory

router.get("/api/grab/item/:user", async (req, res) => {
    try {
        const Inventory = defineInventory(await connectDb(req));
        await Inventory.sync();
        const find_item = await Inventory.findOne({
            where: {
                SKU: req.query.SKU
            },
        });
        if (!find_item) {
            return res.status(200).json({ "message": "no such item found" });
        }
        res.status(200).json({ "item": find_item });
    }
    catch (err) {
        return res.status(500).json({ error: "Internal Server Error" });
    }
}) //grab an item using SKU

router.post("/api/add/item/:user", async (req, res) => {
    const filename = path.join(__dirname, '..', `/inventory_history/restocks/${req.params.user}_tracker.csv`);

    try {
        const Inventory = defineInventory(await connectDb(req));
        const find_item = await Inventory.findOne({
            where: {
                SKU: req.body.SKU
            }
        });
        if(find_item) {
            return res.status(401).json({"message": "SKU already registered"});
        }
        await Inventory.create({ item: req.body.item, desc: req.body.desc, price: parseFloat(req.body.price), SKU: req.body.SKU, stock: Number(req.body.stock) });
        const date = `${format(new Date(), 'MM/dd/yyyy HH:mm')}`;
        const gen_uuid = uuidv4();
        const csvData = `${req.body.SKU},Stocked ${req.body.stock} units,${date},${uuidv4()}\n`;
        fs.appendFile(filename, csvData, function (err) {
            if (err) {
                return res.status(500).json({ "message": "Internal Server Error" });
            }
        })
        return res.status(200).json({ "success": "added item" });
    }   
    catch (err) {
        return res.status(500).json({ error: "Internal Server Error"});
    }
}) //add item to Inventory

router.delete("/api/remove/item/:user/:SKU", async (req, res) => {
    const filename = path.join(__dirname, '..', `/inventory_history/remitems/${req.params.user}_tracker.csv`);
    try {
        const Inventory = defineInventory(await connectDb(req));
        let date = new Date();
        date = `${format(date, 'MM/dd/yyyy HH:mm')}`;
        const gen_uuid = uuidv4();
        console.log(req.params.SKU);
        const data = `${req.params.SKU},${date},${gen_uuid}`;

        fs.appendFile(filename, data, function (err) {
            if (err) {
                return res.status(500).json({ "message": "Internal Server Error" });
            }   
        })
        await Inventory.destroy({
            where: {
                SKU: req.params.SKU,
            },
        });
        res.status(200).json({ "success": "deleted item" });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
}) //remove item from inventory

router.put("/api/modify/item/:user", async (req, res) => {
    try {
        const Inventory = defineInventory(await connectDb(req));
        await Inventory.update(
            req.body,
            {
                where: {
                    SKU: req.body.oldSKU,
                }
            }
        )
        res.status(200).json({ "success": "modified item" });
    }
    catch (err) {
        return res.status(500).json({ error: "Database connection failed" });
    }
}) //modify an item in inventory

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

        const sold = itm.stock -  req.body.stock;
        let data;
        if (sold > 0) {
            const val_sold = sold * itm.price;
            const filename = path.join(__dirname, '..', `/inventory_history/sales/${req.params.user}_tracker.csv`);
            const date = new Date();
            data = `${itm.item},Sold ${sold} units,Monetary sales of ${val_sold}, ${format(date, 'MM/dd/yyyy HH:mm')}, ${uuidv4()}`;
            fs.appendFile(filename, data, err => {
                if (err) {
                    return res.status(500).json({ "message": "Internal Server Error" });
                }
            });
        }
        else {
            const filename = path.join(__dirname, '..', `/inventory_history/restocks/${req.params.user}_tracker.csv`);
            const date = new Date();
            data = `${itm.item},Restocked ${sold} units,${format(date, 'MM/dd/yyyy HH:mm')},${uuidv4()}`,
            fs.appendFile(filename,  data, err => {
                if (err) {
                    return res.status(500).json({ "message": "Internal Server Error" });
                }
            });
        }

        res.status(200).json({ "success": "updated stocks" });
    }

    catch (err) {
        return res.status(500).json({ error: err.message });
    }
}) //sales or restocks are calculated and stored in respective csv files

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
        const extract = find_items.map(({ item, SKU, stock }) => ({ item, SKU, stock }));
        if (find_items.length > 0) {
            return res.status(200).json({ "low": extract });
        }
        res.status(200).json({ "low": "none" });
    }
    catch (err) {
        return res.status(500).json({ error: "Database connection failed" });
    }
}) //static reorder points

//pdf/csv files generator
router.get("/api/inventory/data/:user", async (req, res) => {
    const Inventory = defineInventory(await connectDb(req));
    const grab_data = await Inventory.findAll({
        attributes: ['item', 'desc', 'SKU', 'stock', 'price'],
        raw: true
    });
    if(grab_data.length === 0) {
        return res.status(500).json({"message": "empty"});
    }
    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(grab_data);

    res.header('Content-Type', 'text/csv');
    res.attachment('inventory.csv');
    res.send(csv);
})

router.get("/api/restocks/gen/:user", async (req, res) => {
    const filename = path.join(__dirname, '..', `/inventory_history/restocks/${req.params.user}_tracker.csv`);

    fs.readFile(filename, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading file: ' + err.message);
            return res.status(500).json({ "message": "Internal Server Error" });
        }

        res.setHeader('Content-Type', 'text/csv');
        res.attachment('inventory_stocks.csv');
        res.send(data);
    });
})

router.get("/api/sales/gen/:user", async (req, res) => {
    const filename = path.join(__dirname, '..', `/inventory_history/sales/${req.params.user}_tracker.csv`);
    fs.readFile(filename, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading file: ' + err.message);
            return res.status(500).json({ "message": "Internal Server Error" });
        }
        res.setHeader('Content-Type', 'text/csv');
        res.attachment('inventory_sales.csv');
        // Send the file content
        res.send(data);
    });
})

router.get("/api/removed/gen/:user", async (req, res) => {
    const filename = path.join(__dirname, '..', `/inventory_history/remitems/${req.params.user}_tracker.csv`);
    fs.readFile(filename, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading file: ' + err.message);
            return res.status(500).json({ "message": "Internal Server Error" });
        }
        res.setHeader('Content-Type', 'text/csv');
        res.attachment('inventory_removed_items.csv');

        res.send(data);
    });
})

module.exports = router;