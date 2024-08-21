const express = require('express');
const router = express.Router();
const {Sequelize, DataTypes, DECIMAL} = require('sequelize');
const path = require('path');
const {defineInventory} = require(path.join(__dirname, '..', '/middleware/model.js'));

router.post("/api/add/item/:user", async(req,res) => {
    const db = req.params.db;
    const connect_to_db = new Sequelize({
        dialect: 'sqlite',
        storage: path.join(__dirname, '..', `/databases/${req.params.user}.db`)
    });

    try {
        await connect_to_db.authenticate();
        const Inventory = defineInventory(connect_to_db);
        await Inventory.create({name: req.body.name, desc: req.body.desc, price: parseFloat(req.body.price), SKU: req.body.SKU, stock: Number(req.body.stock)});
        res.status(200).json({"success": "added item"});
    }
    catch (err) {
        console.log('Unable to connect to database: ' + err.message);
    }
})

router.post("/api/remove/item/:user", async(req,res) => {

})

router.post("/api/modify/item/:user", async(req,res) => {

})

router.post("/api/grab/item/:user/:item", async(req,res) => {

})

router.get("/api/produce/csv/:user", async(req,res) => {

})

router.get("/api/check/low/:user", async(req,res) => {

})

router.get("/api/report/gen/:user", async(req,res) => {
    
})


module.exports = router;