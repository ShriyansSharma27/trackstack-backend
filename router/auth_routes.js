const express = require('express');
const router = express.Router();
const {Sequelize, DataTypes} = require('sequelize');
const path = require('path');
const {defineInventory} = require(path.join(__dirname, '..', '/middleware/model.js'));
const bcrypt = require('bcrypt');
const {v4: uuidv4} = require('uuid');
const fs = require('fs');
const {format} = require('date-fns');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './databases/users.db',
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
        req.session.user = username;

        const dbs = createUserInventory(username);
        const invent = defineInventory(dbs);

        await dbs.authenticate();
        await invent.sync({force: true});
        
        
        const fileName1 = path.join(__dirname, '..', `/inventory_history/restocks/${username}_tracker.txt`);
        const fileName2 = path.join(__dirname, '..', `/inventory_history/sales/${username}_tracker.txt`);
        const fileName3 = path.join(__dirname, '..', `/inventory_history/remitems/${username}_tracker.txt`);
        const date = new Date();
        const data = `\t${format(date, 'MM/dd/yyyy HH:mm')}\t${uuidv4()}\n\nItem\t\t\t\tAction\t\t\t\tTime\t\t\t\tRefID\n--------------------------------------------------------------------------------------------------------\n`;    
        fs.appendFile(fileName1, 'Created Restocks Tracker' + data, (err) => {
            if(err) {
                return res.status(500).json({"message": "internal server error"});
            }
        });
        const data1 = `\t${format(date, 'MM/dd/yyyy HH:mm')}\t${uuidv4()}\n\nItem\t\t\t\tSold\t\t\t\tEarnings\t\t\t\tTime\t\t\t\tRefID\n--------------------------------------------------------------------------------------------------------\n`;
        fs.appendFile(fileName2, 'Created Sales Tracker' + data1, (err) => {
            if(err) {
                return res.status(500).json({"message": "internal server error"});
            }
        });
        const data2 = `\t${format(date, 'MM/dd/yyyy HH:mm')}\t${uuidv4()}\n\nItem\t\t\t\tTime\t\t\t\tRefID\n--------------------------------------------------------------------------------------------------------\n`;
        fs.appendFile(fileName3, 'Created Removal of Items Tracker' + data2, (err) => {
            if(err) {
                return res.status(500).json({"message": "internal server error"});
            }
        });
        
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

router.post("/logout", async(req,res) => {
    req.session.destroy(err => {
        if(err) {
            return res.status(500).json({ message: 'Failed to logout' });
        }
        res.clearCookie('connect-sid');
        return res.status(200).json({ message: 'Logged out successfully' });
    });
})




module.exports = router;