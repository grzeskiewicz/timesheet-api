const express = require('express'),
    app = express();
const cors = require('cors');
const http = require('http').Server(app);
const bodyParser = require('body-parser');
const db = require('./db/database');
const user = require('./db/user');
const schedule = require('node-schedule');
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
app.use(bodyParser.json()); // support json encoded bodies 
app.options('*', cors()) // include before other routes


const scheduleMonthlySheets = schedule.scheduleJob('01 00 1 * *', db.createEmptyTimesheets); //schedule every month (00:01 every 1st day of the month)
const scheduleMonthlySummaries = schedule.scheduleJob('01 00 1 * *', db.createEmptyMonthSummaries); //schedule every month (00:01 every 1st day of the month)


app.get('/users', user.users);
app.get('/getroles', user.getRoles);
app.get('/getdeals', user.getDeals);

app.post('/createuser', user.createUser);
app.post('/createuser', db.createEmptyTimesheets);
app.post('/createuser', db.createEmptyMonthSummaries);


app.post('/deleteuser', user.deleteUser);
app.post('/edituser', user.editUser);

app.post('/login', user.login);
app.get('/userinfo', user.userinfo);


app.post('/createsheets', db.createEmptyTimesheets);
app.post('/createsummaries', db.createEmptyMonthSummaries);

app.post('/sethours', db.setHours);
app.post('/setsummary', db.setSummary);

app.post('/getusersheet', db.getUserSheet);
app.post('/getsummary', db.getSummary);

app.get('/sendemails', db.sendEmails);










const port = process.env.PORT || 8080,
    ip = process.env.IP || '0.0.0.0';

http.listen(port, ip);
console.log('Server running on http://%s:%s', ip, port);

module.exports = app;