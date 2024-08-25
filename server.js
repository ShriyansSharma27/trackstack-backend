const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 4000;
const crypto = require('crypto');
const session = require('express-session');
const {authenticate} = require(path.join(__dirname, 'middleware', 'auth.js')); //persistence of the cookie
const cors = require('cors');
const helmet = require('helmet');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({origin: "http://localhost:3000", credentials: true}));
app.use(helmet());
app.use(session({
    secret: crypto.randomBytes(64).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000
    }
}));

app.use("/", require(path.join(__dirname, 'router', 'auth_routes.js')));
app.use("/", authenticate, require(path.join(__dirname, 'router', 'api_routes.js')));
    

app.listen(port, () => {console.log(`Listening...`)});