require('dotenv').config();
const express = require('express'),
    app = express();
const cors = require('cors');
const http = require('http').Server(app);
const bodyParser = require('body-parser');
const db = require('./db/database');
const { body, validationResult } = require('express-validator');


app.use(cors());
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
app.use(bodyParser.json()); // support json encoded bodies 
app.options('*', cors()) // include before other routes


app.get('/', (req, res) => res.send('Welcome!'));

app.post('/addmicrogreens', [
    body('nameEN').isString().withMessage("Not a string!").isLength({max:60}).withMessage("Too long value!"),
    body('namePL').isString().withMessage("Not a string!").isLength({max:60}).withMessage("Too long value!"),
    body('gramsTray').isInt().withMessage("Not integer!"),
    body('topWater').isInt({max:1000}).withMessage("Not integer or too high value!"),
    body('bottomWater').isInt({max:1000}).withMessage("Not integer or too high value!"),
    body('weight').isInt({max:15}).withMessage("Not integer or too high value!"),
    body('blackout').isInt({max:15}).withMessage("Not integer or too high value!"),
    body('light').isInt({max:15}).withMessage("Not integer or too high value!"),
    body('color').isString().withMessage("Not a string!").isLength({max:10}).withMessage("Too long value!"),

],db.addMicrogreens);
app.post('/addcrops',[
    body('harvest').isDate().withMessage("Not a date!"),
    body('microgreenID').isInt().withMessage("Not integer!"),
    body('shelfID').isInt().withMessage("Not integer!"),
    body('trays').isInt().withMessage("Not integer!"),
    body('notes').isString().withMessage("Not string!").isLength({max:500}),
], db.addCrops);
app.post('/addracks',[
    body('name').isLength({max:1}).withMessage("Too long name").matches(/^[A-Za-z\s]+$/).withMessage("No digits allowed"),
    body('shelves').isInt({max:10}).withMessage('Not integer or too high value')
], db.addRacks);

app.get('/crops', db.getCrops);
app.get('/microgreens', db.getMicrogreens);
app.get('/shelves', db.getShelves);

const port = process.env.PORT || 3001,
    ip = process.env.IP || '127.0.0.1';

http.listen(port);
console.log('Server running on http://%s:%s', ip,port);

module.exports = app;