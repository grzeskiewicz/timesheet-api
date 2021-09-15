require('dotenv').config();
const express = require('express'),
    app = express();
const cors = require('cors');
const http = require('http').Server(app);
const bodyParser = require('body-parser');
const db = require('./db/database');
const user = require('./db/user');
const schedule = require('node-schedule');
const uploadImg = require('./upload-img');
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
app.use(bodyParser.json()); // support json encoded bodies 
app.options('*', cors()) // include before other routes
app.use(express.static('public/uploads'));
const scheduleMonthlySheets = schedule.scheduleJob('01 00 1 * *', db.createEmptyTimesheets); //schedule every month (00:01 every 1st day of the month)
const scheduleMonthlySummaries = schedule.scheduleJob('01 00 1 * *', db.createEmptyMonthSummaries); //schedule every month (00:01 every 1st day of the month)

app.get('/', (req, res) => res.send('Welcome!'));

app.get('/users', user.users);
app.get('/getroles', user.getRoles);
app.get('/getdeals', user.getDeals);

app.post('/createuser', user.createUser);
app.post('/createuser', db.createEmptyTimesheets);
app.post('/createuser', db.createEmptyMonthSummaries);


app.post('/delete-user', user.deleteUser);
app.post('/edituser', user.editUser);

app.post('/login', user.login);
app.get('/userinfo', user.userinfo);

app.post('/password-reset', user.passwordReset);
app.post('/store-password', user.storePassword);


app.post('/createsheets', db.createEmptyTimesheets);
app.post('/createsummaries', db.createEmptyMonthSummaries);

app.post('/sethours', db.setHours);
app.post('/setsummary', db.setSummary);

app.post('/getusersheet', db.getUserSheet);
app.post('/getsummary', db.getSummary);

app.get('/sendemails', db.sendEmails);


app.post('/upload-img', uploadImg.upload, (req, res, next) => {
    if (!req.file) {
        const error = new Error('Please upload a file')
        error.httpStatusCode = 400
        return next(error)
    } else {
       // console.log(res.req.file.filename);
        req.body.filename=res.req.file.filename;
        next();
        // res.json ({success:true, msg: "FILE UPLOADED"});
    }
})

app.post('/upload-img', user.updateUserSignature);










const port = process.env.PORT || 3001,
    ip = process.env.IP || '127.0.0.1';

http.listen(port);
console.log('Server running on http://%s:%s', ip,port);

module.exports = app;