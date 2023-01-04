const mysql = require('mysql');
const moment=require('moment');
const dbConfig = require('./dbConfig');
const { body, validationResult } = require('express-validator');

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
           // throw err;                                  // server variable configures this)
    //test
           setTimeout(handleDisconnect, 5000); }
    });
}

handleDisconnect();





//TODO: get microgreens, get crops, get shelves - done
//TODO2: add microgreens, add racks!, add crops
//TODO3: edit microgreens, delete racks, delete shelves,edit crops

const getCrops = function (req, res) {
    connection.query(`SELECT * FROM crops`, function (err, rows) {
        if (err) res.json(err);
        res.json(rows);
    });
}

const getMicrogreens = function (req, res) {
    connection.query(`SELECT * FROM microgreens`, function (err, rows) {
        if (err) res.json(err);
        res.json(rows);
    });
}

const getShelves = function (req, res) {
    connection.query(`SELECT * FROM shelves`, function (err, rows) {
        if (err) res.json(err);
        res.json(rows);
    });
}


const addMicrogreens = function (req, res, next) { //TODO:walidacja pól
    const dataArr=[];
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
      return;
    }
    console.log(req.body)
    for (const key of Object.keys(req.body)) dataArr.push(`'${req.body[key]}'`);
   const [nameEN,namePL,gramsTray,topWater,bottomWater,weight,blackout,light,color] = dataArr;
    const vals=`(${nameEN},${namePL},${gramsTray},${topWater},${bottomWater},${weight},${blackout},${light},${color})`
        connection.query("INSERT INTO microgreens (name_en,name_pl,grams_tray,top_water,bottom_water,weight,blackout,light,color) VALUES" + vals, function (err, rows) {
            if (err) {res.json({success:false,err:err}); return;}
            res.json({ success: true, msg: 'MICROGREENS_ADDED' });
        });   
}

const addCrops = function (req, res, next) { // TODO2: pobieranie rekordow o tym samym shelfid z węższego zakresu (+15.-15?)
   const errors = validationResult(req);
   let lightStartDate;
   const dataArr=[];
   let microgreensData;

   if (!errors.isEmpty()) {res.status(400).json({ errors: errors.array()}); return;}
   
    for (const key of Object.keys(req.body)) dataArr.push(`'${req.body[key]}'`);
    const [harvest,microgreenID,shelfID,trays,notes]=dataArr;
    console.log(moment().format('YYYY-MM-DD hh:mm:ss'))
    const vals=`(${harvest},${microgreenID},${shelfID},${trays},${notes})`;
let harvestDate=moment(req.body.harvest);
    connection.query(`SELECT * FROM microgreens`, function (err, rows) {
        if (err) res.json(err);
        microgreensData=rows;
        microgreen=microgreensData.find(x=> x.id==req.body.microgreenID);
        lightStartDate=moment(req.body.harvest).subtract(microgreen.light, "days");
        connection.query(`SELECT * FROM crops WHERE shelf_id=${shelfID}`, function (err, rowsx) {
    const sameShelfCrops=rowsx;
    let isTaken=false;
    for (const crop of sameShelfCrops){
       //crop.harvest and cropLightStart vs lightStartDate and req.body.harvest
       const cropMicrogreen=microgreensData.find(x=> x.id==crop.microgreen_id);
       const cropHarvest=moment(crop.harvest);
       const cropLightStart=moment(crop.harvest).subtract(cropMicrogreen.light, "days");

       console.log(lightStartDate.format('YYYY-MM-DD'),cropHarvest.format('YYYY-MM-DD'),harvestDate.format('YYYY-MM-DD'),cropLightStart.format('YYYY-MM-DD'))
if((lightStartDate.isSameOrAfter(cropHarvest) || harvestDate.isSameOrBefore(cropLightStart))===false) {
    res.json({ success: false, msg: 'CROP_DATE_TAKEN' });
    isTaken=true;
    break; 
       }
    }
    if (!isTaken) {
        connection.query("INSERT INTO crops (harvest,microgreen_id,shelf_id,trays,notes) VALUES" + vals, function (err, rows) {
        if (err) {
            res.json(err);
        return;
        }
        res.json({ success: true, msg: 'CROP_ADDED' });
    });    
}

       });

    });
}


const addRacks = function (req, res, next) {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
              return res.status(400).json({ errors: errors.array() });
            }
    const name=req.body.name;
    const shelves=req.body.shelves;
    let vals='';
    for (let i=0;i<shelves;i++){
if (i==0 ) {vals=`('${name}',${i})`} else {vals=vals.concat(',',`('${name}',${i})`);}
    }
    connection.query("INSERT INTO shelves (rack_name,level) VALUES "+vals , function (err, rows) {
        if (err) {
            res.json({success:false, err:err});
        } else {
            res.json({ success: true, msg: 'RACK_ADDED' });
        }
    
    });  
}


const editMicrogreens= function (req, res) {
    const microgreens = req.body;
    connection.query(`UPDATE microgreens SET name_en='${microgreens.nameEN}',name_pl='${microgreens.namePL}',grams_tray='${microgreens.gramsTray}'
    , sprinkle_water='${microgreens.sprinkleWater}',bottom_water='${microgreens.bottomWater}',weight='${microgreens.weight}',blackout='${microgreens.blackout}'
    ,light='${microgreens.light}' WHERE id='${microgreens.id}'`, function (err, result) {
        if (err) {res.json({ success: false, msg: err }); return;}
        res.json({ succes: true, msg: "MICROGREENS_EDITED" });
    });
}

const editCrop= function (req, res) {
    const crop = req.body;
    connection.query(`UPDATE crops SET harvest='${crop.harvest}',microgreen_id='${crop.microgreenID}',shelf_id='${crop.shelfID}'
    , trays='${crop.tray}',notes='${crop.notes}' WHERE id='${crop.id}'`, function (err, result) {
        if (err) {res.json({ success: false, msg: err }); return;}
        res.json({ succes: true, msg: "CROP_EDITED" });
    });
}


module.exports = {getCrops, getMicrogreens,getShelves, addMicrogreens, addRacks, addCrops,editCrop,editMicrogreens };