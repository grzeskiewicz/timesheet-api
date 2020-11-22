const express = require('express'),
    app = express();
const cors = require('cors');
const http = require('http').Server(app);
const bodyParser = require('body-parser');
const db = require('./db/database');
const user = require('./db/user');
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
app.use(bodyParser.json()); // support json encoded bodies 
app.options('*', cors()) // include before other routes






app.get('/users', user.users);
app.get('/getroles', user.getRoles);
app.get('/getdeals', user.getDeals);

app.post('/createuser', user.createUser);
app.post('/deleteuser', user.deleteUser);
app.post('/edituser', user.editUser);

app.post('/login', user.login);
app.get('/userinfo', user.userinfo);


app.post('/createsheets', db.createEmptyTimesheets);
app.post('/sethours', db.setHours);
app.post('/getusersheet', db.getUserSheet);









const port = process.env.PORT || 8080,
    ip = process.env.IP || '127.0.0.1';

http.listen(port, ip);
console.log('Server running on http://%s:%s', ip, port);

module.exports = app;