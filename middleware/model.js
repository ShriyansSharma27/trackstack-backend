const { Sequelize, DataTypes } = require("sequelize");
const path = require('path');

const defineInventory = (sequelize) => {
    return sequelize.define('Inventory', {     
        item: DataTypes.STRING,
        desc: DataTypes.STRING,
        price: DataTypes.DECIMAL,
        SKU: DataTypes.STRING,
        stock: DataTypes.INTEGER
    });
}

const connectDb = async(req) => {
    const connect_to_db = new Sequelize({
        dialect: 'sqlite',
        storage: path.join(__dirname, '..', `/databases/${req.params.user}.db`)
    });
    await connect_to_db.authenticate();
    return connect_to_db;
}

module.exports = {defineInventory, connectDb};