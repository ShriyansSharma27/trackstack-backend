const express = require('express');
const router = express.Router();
const {Sequelize, DataTypes} = require('sequelize');
const bcrypt = require('bcrypt');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './users.db'
});

const User = sequelize.define('User', {
    username: DataTypes.STRING,
    password: DataTypes.STRING
});


const connect = async() => {
    await sequelize.authenticate();
    await sequelize.sync();
}
connect();

function defineInventory(sequelize) {
    return sequelize.define('Inventory', {     
        name: DataTypes.STRING,
        desc: DataTypes.STRING,
        price: DataTypes.INTEGER,
        SKU: DataTypes.STRING,
        stock: DataTypes.INTEGER
        
    })
}

function createUserInventory(username) {
    const dbName = `${username}`;

    return new Sequelize({
        dialect: 'sqlite',
        storage: path.join(__dirname, `./databases/${dbName}`),
        logging: false
    });
}

router.post("/signup", async(req,res) => {
    const {username, password} = req.body;
    const find_dups = await User.findAll({
        where: {
            username: username,
        },
    });
    if(find_dups.length > 0) {
        return res.status(401).json({"message": "conflict"});
    }
    
    try {
        const hshed_pwd = await bcrypt.hash(password,10);
        await User.create({username: username, password: hshed_pwd});
        const dbs = createUserInventory(username);
        const invent = defineInventory(dbs);

        await dbs.authenticate();
        await dbs.sync({force: true});

        return res.status(201).json({"success": "created"});
      
    }
    catch (err) {
        return res.status(500).json({"message": "Internal Error"});
    }
})




module.exports = router;