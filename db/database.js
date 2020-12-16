const mysql = require('mysql')
const date = require('../date');
const dbConfig=require('./dbConfig');
const nodemailer = require('nodemailer');

/*
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'benake',
    password: 'Palkast123!',
    database: 'timesheet',
    port: 3306
}); */


let connection;

function handleDisconnect() {
  connection = mysql.createConnection(dbConfig.config); // Recreate the connection, since
                                                  // the old one cannot be reused.

  connection.connect(function(err) {              // The server is either down
    if(err) {                                     // or restarting (takes a while sometimes).
      console.log('error when connecting to db:', err);
      setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
    }                                     // to avoid a hot loop, and to allow our node script to
  });                                     // process asynchronous requests in the meantime.
                                          // If you're also serving http, display a 503 error.
  connection.on('error', function(err) {
    console.log('db error', err);
    if(err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
      handleDisconnect();                         // lost due to either server restart, or a
    } else {                                      // connnection idle timeout (the wait_timeout
      throw err;                                  // server variable configures this)
    }
  });
}

handleDisconnect();


const HOLIDAYS = [
    { day: 1, month: 1 },
    { day: 6, month: 1 },
    { day: 1, month: 5 },
    { day: 3, month: 5 },
    { day: 15, month: 8 },
    { day: 1, month: 11 },
    { day: 11, month: 11 },
    { day: 25, month: 12 },
    { day: 26, month: 12 }
]
//ruchome: wielkanoc I, wielkanoc II, zielony świątek, boże ciało







const createEmptyTimesheets = function (req, res, next) {
    console.log(typeof req.body === "undefined");
    console.log(req.body);
    const month = typeof req.body !== "undefined" ? (typeof req.body.month !== "undefined" ? req.body.month : new Date().getMonth() + 1) : new Date().getMonth() + 1;
    console.log(month);
    const days = date.daysInMonth(month, 2020);
    const holidaysMonth = HOLIDAYS.filter(element => element.month === Number(month));

    connection.query("SELECT id FROM users", function (err, rows) { // WHERE deal=1
        if (err) res.json(err);

        const ids = Object.keys(rows).map((key) => rows[key].id);
        const userday = [];
        for (const id of ids) {
            for (let day = 1; day <= days; day++) {
                let isPublicHoliday = false;
                for (const holiday of holidaysMonth) {
                    if (holiday.day === day) isPublicHoliday = true;
                }
                const record = id + "," + month + "," + day + "," + isPublicHoliday;
                userday.push(record);
            }
        }

        const mapka = userday.map((record) => {
            return `(${record})`;
        });

        connection.query("INSERT IGNORE INTO dayrecords (user,month,day,ispublicholiday) VALUES" + mapka, function (err, rows) {
            if (err) {
                // console.log(err);
                res.json(err);
            }

            if (typeof req.body !== "undefined" && typeof req.body.month !== "undefined") res.json({ success: true, msg: "SHEETS CREATED" });
            console.log("createsheeets 3 insert");
            if (typeof req.body !== "undefined" && typeof req.body.month === "undefined") {
                console.log("Przekazuje dalej");
                next();
            }
        });

    });
}


const createEmptyMonthSummaries = function (req, res, next) {
    console.log("summaries1");

    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;
    const allUsers = (typeof req.body !== "undefined" && typeof req.body.updateallusers !== "undefined") ? req.body.updateallusers : true;
    connection.query("SELECT id FROM users", function (err, rows) { // WHERE deal=1
        if (err) res.json(err);
        console.log("summaries2");
        const ids = Object.keys(rows).map((key) => rows[key].id);
        const summaries = [];
        for (const id of ids) {
            const record = id + "," + month + "," + year;
            summaries.push(record);
        }

        const mapka = summaries.map((record) => {
            return `(${record})`;
        });



        connection.query("INSERT IGNORE INTO monthsummaries (user,month,year) VALUES" + mapka, function (err, rows) {
            if (err) res.json(err);
            console.log(req.body);

            if (allUsers && typeof req.body !== "undefined" && typeof req.body.updateallusers !== "undefined") console.log("Tuta1") && res.json({ success: true, msg: "SUMMARIES CREATED" });
            if (typeof req.body !== "undefined" && typeof req.body.updateallusers === "undefined") {
                console.log("Tuta2");
                res.end();}
            
        });

    });
}


const setHours = function (req, res) {
    const id = req.body.id;
    const start = req.body.start == null ? null : `'${req.body.start}'`;
    const finish = req.body.finish == null ? null : `'${req.body.finish}'`;
    const sickOrHoliday = Number(req.body.status) === 4 || Number(req.body.status) === 5;
    const state = sickOrHoliday ? req.body.status : (new Date(req.body.start).getHours() >= 20 ? 3 : 2) //NIGHTSHIFT:DAYSHIFT

    if (sickOrHoliday) {
        connection.query(`UPDATE dayrecords SET state ='${state}' WHERE id=${id}`, function (err, rows) {
            if (err) { console.log(err); res.json(err); }
            res.json({ success: true, msg: 'Day updated!' });
        });
    } else {
        connection.query(`UPDATE dayrecords SET start=${start}, finish=${finish}, state ='${state}' WHERE id=${id}`, function (err, rows) {
            if (err) { console.log(err); res.json(err); }
            res.json({ success: true, msg: 'Day updated!' });
        });
    }

}


const setSummary = function (req, res) {
    const id = req.body.id;
    const bonus = req.body.bonus !== '' ? String(req.body.bonus) : 0;
    const overtime = req.body.overtime !== '' ? String(req.body.overtime) : 0;

    connection.query(`UPDATE monthsummaries SET bonus ='${bonus}', overtime='${overtime}' WHERE id=${id}`, function (err, rows) {
        if (err) res.json(err);
        res.json({ success: true, msg: 'SUMMARY UPDATED' });
    });
}


const getUserSheet = function (req, res) {
    const userid = req.body.id;
    const month = req.body.month;
    connection.query(`SELECT dr.id,dr.user, dr.month,dr.day,dr.start,dr.finish,ds.state,dr.ispublicholiday,dr.locked FROM dayrecords dr INNER JOIN daystates ds ON dr.state=ds.id WHERE dr.user='${userid}' AND dr.month='${month}' ORDER BY dr.day`, function (err, rows) {
        if (err) res.json(err);
        res.json(rows);
    });
}


const getSummary = function (req, res) {
    const user = req.body.user;
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    connection.query(`SELECT * FROM monthsummaries WHERE user='${user}' AND month='${month}'  AND year='${year}'`, function (err, rows) {
        if (err) res.json(err);
        res.json(rows[0]);
    });
}

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'timesheet.klaster@gmail.com',
        pass: 'Twojastara123'
    }
});

const sendEmails = function (req, res) {

    connection.query("SELECT email FROM users", function (err, rows) { // "WHERE deal=1""
        if (err) res.json(err);
        const emails = Object.keys(rows).map((key) => rows[key].email).join(",");

        var mailOptions = {
            from: 'timesheet.klaster@gmail.com',
            to: emails,
            subject: '[Lista obecności] Przypomnienie',
            text:
                `
        Witam, 
        przypominam o wypełnieniu listy obecności za obecny miesiąc!
            
        Pozdrawiam,
        Administrator.
            `
        };

        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
            } else {
                res.json({ success: true, msg: 'EMAILS SENT' });
                console.log('Email sent: ' + info.response);
            }
        });
    });

}

module.exports = { createEmptyTimesheets, createEmptyMonthSummaries, setHours, getUserSheet, getSummary, setSummary, sendEmails };