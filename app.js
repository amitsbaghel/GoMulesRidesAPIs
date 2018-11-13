var express = require('express');
var app=express();
var db=require('./db');

// user controller
var UserController=require('./controller/userController');
// ride controller
var RideController=require('./controller/rideController');
// booking controller
var BookingController=require('./controller/bookingController');
//upload controller
var UploadController =require('./controller/uploadController');

// https://enable-cors.org/server_expressjs.html
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });

// user 
app.use('/user',UserController);

// ride
app.use('/ride',RideController);

// booking
app.use('/book',BookingController);

//upload
app.use('/upload',UploadController);

module.exports=app;