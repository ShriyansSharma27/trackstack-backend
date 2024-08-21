const express = require('express');
const router = express.Router();
const {Sequelize, DataTypes} = require('sequelize');
const path = require('path');
const {defineInventory} = require(path.join(__dirname, '..', '/middleware/model.js'));
const bcrypt = require('bcrypt');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './users.db',
    logging: false
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

function createUserInventory(username) {
    const dbName = `${username}`;

    return new Sequelize({
        dialect: 'sqlite',
        storage: path.join(__dirname, '..', `./databases/${dbName}.db`),
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
        await invent.sync({force: true});

        return res.status(201).json({"success": "created"});
      
    }
    catch (err) {
        return res.status(500).json({"message": "Internal Error"});
    }
})

router.post("/login", async(req,res) => {
    const {username, password} = req.body;
    const find_user = await User.findOne({
        where: {
            username: username
        },
    });

    if(!find_user) {
        return res.status(404).json({"message": "not found"});
    }

    if(await bcrypt.compare(password, find_user.password)) {
        req.session.user = username;
        return res.status(200).json({"success": "user found"});
    }

    return res.status(401).json({"message": "password invalid"});
})




module.exports = router;