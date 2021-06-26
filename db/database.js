const mysql = require('mysql')
const date = require('../date');
const dbConfig = require('./dbConfig');
const mailConfig = require('../mailConfig');
const nodemailer = require('nodemailer');


let connection;

function handleDisconnect() {
    connection = mysql.createConnection(dbConfig.config); // Recreate the connection, since
    // the old one cannot be reused.

    connection.connect(function (err) {              // The server is either down
        if (err) {                                     // or restarting (takes a while sometimes).
            console.log('error when connecting to db:', err);
            setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
        }                                     // to avoid a hot loop, and to allow our node script to
    });                                     // process asynchronous requests in the meantime.
    // If you're also serving http, display a 503 error.
    connection.on('error', function (err) {
        console.log('db error', err);
        if (err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
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

const CHANGING_HOLIDAYS = {
    [2021]: [
        { day: 4, month: 4 },
        { day: 4, month: 4 },
        { day: 23, month: 5 },
        { day: 3, month: 6 }
    ]
    ,
    [2022]: [
        { day: 17, month: 4 },
        { day: 18, month: 4 },
        { day: 5, month: 6 },
        { day: 16, month: 6 }
    ],
    [2023]: [
        { day: 9, month: 4 },
        { day: 10, month: 4 },
        { day: 28, month: 5 },
        { day: 8, month: 6 }
    ],
    [2024]: [
        { day: 31, month: 3 },
        { day: 1, month: 4 },
        { day: 19, month: 5 },
        { day: 30, month: 5 }
    ],
    [2025]: [
        { day: 20, month: 4 },
        { day: 21, month: 4 },
        { day: 8, month: 6 },
        { day: 19, month: 6 }
    ],
    [2026]: [
        { day: 5, month: 4 },
        { day: 6, month: 4 },
        { day: 24, month: 5 },
        { day: 4, month: 6 }
    ],
    [2027]: [
        { day: 28, month: 3 },
        { day: 29, month: 3 },
        { day: 16, month: 5 },
        { day: 27, month: 5 }
    ],
    [2028]: [
        { day: 16, month: 4 },
        { day: 17, month: 4 },
        { day: 4, month: 6 },
        { day: 15, month: 6 }
    ],
    [2029]: [
        { day: 1, month: 4 },
        { day: 2, month: 4 },
        { day: 20, month: 5 },
        { day: 31, month: 5 }
    ],
    [2030]: [
        { day: 21, month: 4 },
        { day: 22, month: 4 },
        { day: 9, month: 6 },
        { day: 20, month: 6 }
    ],
    [2031]: [
        { day: 1, month: 4 },
        { day: 2, month: 4 },
        { day: 1, month: 6 },
        { day: 12, month: 6 }
    ],
    [2032]: [
        { day: 28, month: 3 },
        { day: 29, month: 3 },
        { day: 16, month: 5 },
        { day: 27, month: 5 }
    ],
    [2033]: [
        { day: 17, month: 4 },
        { day: 18, month: 4 },
        { day: 5, month: 6 },
        { day: 16, month: 6 }
    ]
}
//ruchome: wielkanoc I, wielkanoc II, zielony świątek, boże ciało







const createEmptyTimesheets = function (req, res, next) {

    const month = typeof req.body !== "undefined" ? (typeof req.body.month !== "undefined" ? req.body.month : new Date().getMonth() + 1) : new Date().getMonth() + 1;
    const year = typeof req.body !== "undefined" ? (typeof req.body.year !== "undefined" ? req.body.year : new Date().getFullYear()) : new Date().getFullYear;


    const days = date.daysInMonth(month, 2020);
    const holidaysMonth = HOLIDAYS.filter(element => element.month === Number(month));
    const changingHolidaysMonth = CHANGING_HOLIDAYS[year].filter(element => element.month === Number(month));
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
                for (const holiday of changingHolidaysMonth) {
                    if (holiday.day === day) isPublicHoliday = true;
                }

                const record = id + "," + year + "," + month + "," + day + "," + isPublicHoliday;
                userday.push(record);
            }
        }

        const mapka = userday.map((record) => {
            return `(${record})`;
        });

        connection.query("INSERT IGNORE INTO dayrecords (user,year,month,day,ispublicholiday) VALUES" + mapka, function (err, rows) {
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
    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;
    const allUsers = (typeof req.body !== "undefined" && typeof req.body.updateallusers !== "undefined") ? req.body.updateallusers : true;
    connection.query("SELECT id FROM users", function (err, rows) { // WHERE deal=1
        if (err) res.json(err);
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

            if (allUsers && typeof req.body !== "undefined" && typeof req.body.updateallusers !== "undefined") res.json({ success: true, msg: "SUMMARIES CREATED" });
            if (typeof req.body !== "undefined" && typeof req.body.updateallusers === "undefined") {
                res.end();
            }

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
        connection.query(`UPDATE dayrecords SET state ='${state}', start=NULL,finish=NULL WHERE id=${id}`, function (err, rows) {
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
    const year = req.body.year;
    connection.query(`SELECT dr.id,dr.user, dr.month,dr.day,dr.start,dr.finish,ds.state,dr.ispublicholiday,dr.locked FROM dayrecords dr INNER JOIN daystates ds ON dr.state=ds.id WHERE dr.user='${userid}' AND dr.month='${month}' AND dr.year='${year}' ORDER BY dr.day`, function (err, rows) {
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

const transporter = nodemailer.createTransport(mailConfig.config);

const sendEmails = function (req, res) {

    connection.query("SELECT email FROM users", function (err, rows) { // "WHERE deal=1""
        if (err) res.json(err);
        const emails = Object.keys(rows).map((key) => rows[key].email).join(",");

        const mailOptions = {
            from: 'timesheet.klaster@gmail.com',
            to: 'timesheet.klaster@gmail.com',
            bcc: emails,
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