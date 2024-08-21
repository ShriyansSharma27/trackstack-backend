const { DataTypes } = require("sequelize");

const defineInventory = (sequelize) => {
    return sequelize.define('Inventory', {     
        name: DataTypes.STRING,
        desc: DataTypes.STRING,
        price: DataTypes.DECIMAL,
        SKU: DataTypes.STRING,
        stock: DataTypes.INTEGER
        
    })
}

module.exports = {defineInventory};