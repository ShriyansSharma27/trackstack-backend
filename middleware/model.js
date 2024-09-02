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
} //return the table definition

const connectDb = async(req) => {
    const connect_to_db = new Sequelize({
        dialect: 'sqlite',
        storage: path.join(__dirname, '..', `/databases/${req.params.user}.db`),
        logging: false
    });
    await connect_to_db.authenticate();
    return connect_to_db;
} //connect to the database of the user

module.exports = {defineInventory, connectDb};