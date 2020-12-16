const bcrypt = require('bcrypt');
const mysql = require('mysql');
const jwt = require('jsonwebtoken');
const express = require('express');
const app = express();
const cors = require('cors');
const date = require('../date');
const dbConfig=require('./dbConfig');


const bodyParser = require('body-parser');
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
app.use(bodyParser.json()); // support json encoded bodies 


/*
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'benake',
    password: 'Palkast123!',
    database: 'timesheet',
    port: 3306
}); */

const connection = mysql.createConnection(dbConfig.config);

const comparePassword = function (password, hash) {
    return bcrypt.compareSync(password, hash);
}

const getDeals = (req, res) => {
    connection.query("SELECT * FROM deals", function (err, rows) {
        if (err) res.json(err);
        res.json(rows);
    });
}


const getRoles = (req, res) => {
    connection.query("SELECT * FROM roles", function (err, rows) {
        if (err) res.json(err);
        res.json(rows);
    });
}

const createUser = function (req, res, next) {
    const vals = Object.keys(req.body).map((key) => req.body[key]);
    vals.push(String(date.datetimeNow()));
    connection.query("select 1 from users where email='" + req.body.email + "'", function (err, rows) {
        if (err) res.json(err);
        const userExists = rows[0];
        if (userExists) res.json({ success: false, msg: "USER EXISTS" });
        else {
            vals[3] = bcrypt.hashSync(req.body.password, 10);
            connection.query("INSERT INTO users(name,surname,email,password,deal,role,creation_date) VALUES(?,?,?,?,?,?,?)", vals, function (err, result) {
                if (err) res.json({ success: false, msg: "USER INSERT ERROR" });
                res.json({ success: true, msg: "USER CREATED" });
                next();
            });
        }

    });

}

const editUser = function (req, res) {
    const name = req.body.name;
    const surname = req.body.surname;
    const email = req.body.email;
    const deal = req.body.deal;
    const role = req.body.role;
    const password = (req.body.password === '' || req.body.password === null || req.body.password === undefined) ? null : bcrypt.hashSync(req.body.password, 10);

    connection.query(`UPDATE users SET name='${name}', 
    surname='${surname}', 
    email ='${email}', deal='${deal}', 
    role='${role}',
    password= IFNULL('${password}',password)
    WHERE email='${email}'`, function (err, rows) {
        if (err) res.json(err);
        res.json({ success: true, msg: 'USER UPDATED' });
    });
}

const deleteUser = function (req, res) {
    connection.query("delete from users where id=" + req.body.id, function (err, rows) {
        if (err) res.json(err);
        res.json(rows);
    });
}


const users = function (req, res) {
    connection.query("SELECT id,email,name,surname,role,deal FROM users", function (err, rows) {
        if (err) res.json(err);
        res.json(rows);
    });
}




const login = function (req, res) {
    connection.query("select * from users where email='" + req.body.email + "'", function (err, rows) {
        if (err) throw err
        user = rows[0];
        if (user) {
            if (!comparePassword(req.body.password, user.password)) {
                res.json({ success: false, msg: "WRONG PASSWORD" });
            } else {
                return res.json({ success: true, msg: "LOGIN SUCCESS", token: 'JWT ' + jwt.sign({ email: user.email, name: user.name, surname: user.surname, id: user.id }, 'RESTFULAPIs') });
            }
        } else {
            res.json({ success: false, msg: "USER NOT FOUND" });
        }

    });
};


const userinfo = function (req, res, next) {
    if (req.headers && req.headers.authorization && req.headers.authorization.split(' ')[0] === 'JWT') {
        jwt.verify(req.headers.authorization.split(' ')[1], 'RESTFULAPIs', function (err, decode) {
            if (err) req.user = undefined; // ?

            connection.query("select id,email,role from users where email='" + decode.email + "'", function (err, rows) {
                const user = rows[0];
                if (user) {
                    res.json({ success: true, email: decode.email, role: user.role, id: user.id });
                } else {
                    res.json({ success: false, msg: "USER NOT FOUND" });
                }
            });
            req.user = decode; //?
            // next();
        });
    } else {
        res.json({ success: false, msg: "Token not provided" });
        req.user = undefined; //?
        //next();
    }
};


const loginRequired = function (req, res, next) {
    if (req.user) {
        console.log("loginRequired");
        next();
    } else {
        return res.status(401).json({ message: 'Unauthorized user!' });
    }
};

module.exports = { users, createUser, editUser, deleteUser, login, loginRequired, userinfo, getRoles, getDeals }