const bcrypt = require('bcrypt');
const crypto = require('crypto');
const moment = require('moment');
const mysql = require('mysql');
const jwt = require('jsonwebtoken');
const express = require('express');
const app = express();
const cors = require('cors');
const date = require('../date');
const dbConfig = require('./dbConfig');
//const mailConfig = require('../mailConfig');
const nodemailer = require('nodemailer');



const bodyParser = require('body-parser');
const { json } = require('body-parser');
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
app.use(bodyParser.json()); // support json encoded bodies 

let connection;

function handleDisconnect() {
    connection = mysql.createConnection(dbConfig.config); // Recreate the connection, since
    // the old one cannot be reused.

    connection.connect(function (err) {              // The server is either down
        if (err) {                                     // or restarting (takes a while sometimes).
            // console.log('error when connecting to db:', err);
            setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
        }                                     // to avoid a hot loop, and to allow our node script to
    });                                     // process asynchronous requests in the meantime.
    // If you're also serving http, display a 503 error.
    connection.on('error', function (err) {
        //console.log('db error', err);
        if (err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
            handleDisconnect();                         // lost due to either server restart, or a
        } else {                                      // connnection idle timeout (the wait_timeout
            throw err;                                  // server variable configures this)
        }
    });
}

handleDisconnect();

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
    const creationDate = String(date.datetimeNow());
    let { id, name, surname, email, password, deal, role } = req.body;
    connection.query("select 1 from users where email='" + email + "'", function (err, rows) {
        if (err) res.json(err);
        const userExists = rows[0];
        if (userExists) res.json({ success: false, msg: "USER EXISTS" });
        else {
            password = bcrypt.hashSync(req.body.password, 10);
            connection.query(`INSERT INTO users(name,surname,email,password,deal,role,creation_date) VALUES("${name}","${surname}","${email}","${password}",${deal},${role},'${creationDate}')`, function (err, result) {
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
    const userID = req.body.id;
    connection.query(`UPDATE IGNORE users SET name='${name}', 
    surname='${surname}', 
    email ='${email}', deal='${deal}', 
    role='${role}'
    WHERE id='${userID}'`, function (err, rows) {
        if (err) res.json(err);
        if (rows.changedRows === 0) {
            res.json({ success: false, msg: 'NO CHANGES' });
        } else {
            res.json({ success: true, msg: 'USER UPDATED' });
        }
    });
}

const updateUserSignature = function (req, res) {
    const userID = req.body.user;
    const filename = req.body.filename;
    console.log(userID, filename);
    connection.query(`UPDATE IGNORE users SET signature='${filename}' WHERE id='${userID}'`, function (err, rows) {
        if (err) res.json(err);
        if (rows.changedRows === 0) {
            res.json({ success: false, msg: 'NO CHANGES' });
        } else {
            res.json({ success: true, msg: 'SIGNATURE UPDATED' });
        }
    });
}

const deleteUser = function (req, res) {
    connection.query("delete from users where id=" + req.body.user, function (err, rows) {
        if (err) res.json({ err: err });
        res.json({ success: true, msg: "USER DELETED" });
    });
}


const users = function (req, res) {
    connection.query("SELECT id,email,name,surname,role,deal,signature FROM users", function (err, rows) {
        if (err) res.json(err);
        res.json(rows);
    });
}




const login = function (req, res) {
    console.log(req.body);
    connection.query("select * from users where email='" + req.body.email + "'", function (err, rows) {
        console.log("Here");
        if (err) {
            res.json({ err: err });
            return;
        }
        user = rows[0];
        console.log(rows);
        if (user) {
            if (!comparePassword(req.body.password, user.password)) {
                res.json({ success: false, msg: "WRONG PASSWORD" });
                return;
            } else {
                res.json({ success: true, msg: "LOGIN SUCCESS", token: 'JWT ' + jwt.sign({ email: user.email, name: user.name, surname: user.surname, id: user.id }, 'RESTFULAPIs') }); //return json?
                return;
            }
        } else {
            res.json({ success: false, msg: "USER NOT FOUND" });
            return;
        }

    });
};


const userinfo = function (req, res) { //next
    console.log(req.headers.authorization);
    if (req.headers && req.headers.authorization && req.headers.authorization.split(' ')[0] === 'JWT') {
        jwt.verify(req.headers.authorization.split(' ')[1], 'RESTFULAPIs', function (err, decode) {
            if (err) res.json({ success: false, msg: "USER NOT FOUND" });   // req.user = undefined; //?
            connection.query("select id,email,role from users where email='" + decode.email + "'", function (err, rows) {
                if (err) {
                    res.json({ success: false, error: err });
                    return;
                }
                if (!rows || rows === undefined) {
                    res.json({ success: false, msg: "USER NOT FOUND" }); // rows[0] might not exist if rows undefined
                    return;
                }

                const user = rows[0];
                if (user) {
                    res.json({ success: true, email: decode.email, role: user.role, id: user.id });
                    return;
                } else {
                    res.json({ success: false, msg: "USER NOT FOUND" });
                }
            });
            //   req.user = decode; //?
            // next();
        });
    } else {
        res.json({ success: false, msg: "Token not provided" });
        // req.user = undefined; //?
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



const passwordReset = function (req, res) {
    const email = req.body.email;
    console.log(email);
    connection.query("select id from users where email='" + email + "'", function (err, rows) {
        if (err) throw err
        const user = rows[0];
        if (user) {
            connection.query("select * from authresets where user='" + user.id + "' AND status=0", function (err, row) {
                const authreset = row[0];
                console.log(row);
                if (authreset) connection.query("DELETE FROM authresets where id='" + authreset.id + "'", function (err, rowdel) { if (err) res.json({ err: err }) });
                const token = crypto.randomBytes(32).toString('hex');//creating the token to be sent to the forgot password form (react)
                bcrypt.hash(token, 10, function (err, hash) {//hashing the password to store in the db node.js
                    if (err) res.json({ err: err });
                    const timeNow = new Date();
                    const expire = date.datetimeParam(new Date(timeNow.setDate(timeNow.getDate() + 1)));
                    console.log(expire);
                    connection.query(`INSERT INTO authresets(user,token,expire) VALUES(${user.id},"${hash}",'${expire}')`, function (err, authresetinsert) {
                        if (err) res.json({ err: err });

                        const transporter = nodemailer.createTransport(process.env.CONFIG);
                        const mailOptions = {
                            from: 'timesheet.klaster@gmail.com',
                            to: email,
                            subject: '[Lista obecności] Reset hasła',
                            html:
                                '<p>Witam,</p>' +
                                '<p>link do resetu hasła: </p>' + '<a href=' + 'http://timesheet-klaster.herokuapp.com/' + 'reset/' + user.id + '/' + token + '">' + 'http://timesheet-klaster.herokuapp.com/' + 'reset/' + user.id + '/' + token + '</a>' +

                                '<p>Pozdrawiam,</p>' +
                                '<p>Administrator.</p>'
                        };

                        transporter.sendMail(mailOptions, function (error, info) {
                            if (error) {
                                console.log(error);
                            } else {
                                res.json({ success: true, msg: 'PASSWORD RESET LINK SENT' });
                                console.log('Email sent: ' + info.response);
                            }
                        });


                    });


                });

            });
        } else {
            res.json({ success: false, msg: "USER NOT FOUND" });
        }
    });
}


const storePassword = function (req, res) {
    const { user, token, password } = req.body;
    console.log(req.body);
    if (token === undefined) res.json({ success: false, msg: "NO TOKEN" });
    connection.query("select * from authresets where user='" + user + "' AND status=0", function (err, row) {
        if (err) res.json({ success: false, err: err });
        const authreset = row[0];
        if (!authreset || authreset === undefined) {
            res.json({ success: false, msg: 'INVALID EXPIRED TOKEN' });
            return;
        }
        if (authreset === undefined) {
            res.json({ success: false, msg: "NO TOKEN" });
            return;
        }
        bcrypt.compare(token, authreset.token, function (errBcrypt, resBcrypt) {// the token and the hashed token in the db are verified befor updating the password
            let expireTime = moment.utc(authreset.expire);
            let currentTime = new Date();
            bcrypt.hash(password, 10, function (err, hash) {
                if (err) res.json({ success: false, err: err });
                connection.query(`UPDATE users SET password='${hash}' WHERE id='${user}'`, function (err, rows) {
                    if (err) res.json({ success: false, err: err });
                    connection.query(`UPDATE authresets SET status=1 WHERE id='${authreset.id}'`, function (err, rows) {
                        res.json({ success: true, msg: 'PWD UPDATED' });
                    });
                });
            });
        });
    });
}


module.exports = { users, createUser, editUser, deleteUser, login, loginRequired, userinfo, getRoles, getDeals, passwordReset, storePassword, updateUserSignature }