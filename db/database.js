const mysql = require('mysql')
const async = require("async");
const date = require('../date');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'benake',
    password: 'Palkast123!',
    database: 'timesheet',
    port: 3306
});

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







const createEmptyTimesheets = function (req, res) {
    const days = date.daysInMonth(req.body.month, 2020);
    const holidaysMonth = HOLIDAYS.filter(element => element.month === Number(req.body.month));

    connection.query("SELECT id FROM users WHERE deal=1", function (err, rows) {
        if (err) res.json(err);

        const ids = Object.keys(rows).map((key) => rows[key].id);
        const userday = [];
        for (const id of ids) {
            for (let day = 1; day <= days; day++) {
                let isPublicHoliday = false;
                for (const holiday of holidaysMonth) {
                    if (holiday.day === day) isPublicHoliday = true;
                }
                const record = id + "," + req.body.month + "," + day + "," + isPublicHoliday;
                userday.push(record);
            }
        }

        const mapka = userday.map((record) => {
            return `(${record})`;
        });

        connection.query("INSERT IGNORE INTO dayrecords (user,month,day,ispublicholiday) VALUES" + mapka, function (err, rows) {
            if (err) res.json(err);
            res.json({ success: true, msg: "SHEETS CREATED" });
        });

    });
}



const setHours = function (req, res) {
    const start = req.body.start;
    const finish = req.body.finish;
    const id = req.body.id;
    const state = new Date(start).getHours() >= 20 ? 3 : 2; //NIGHTSHIFT:DAYSHIFT
    connection.query(`UPDATE dayrecords SET start='${start}', finish='${finish}', state ='${state}' WHERE id=${id}`, function (err, rows) {
        if (err) res.json(err);
        res.json({ success: true, msg: 'Day updated!' });
    });
}


const getUserSheet = function (req, res) {
    console.log(req.body);
    const userid = req.body.id;
    const month = req.body.month;
    connection.query(`SELECT dr.id,dr.user, dr.month,dr.day,dr.start,dr.finish,ds.state,dr.ispublicholiday,dr.locked FROM dayrecords dr INNER JOIN daystates ds ON dr.state=ds.id WHERE dr.user='${userid} AND dr.month=${month}' ORDER BY dr.day`, function (err, rows) {
        if (err) res.json(err);
        res.json(rows);
    });
}

module.exports = { createEmptyTimesheets, setHours, getUserSheet };