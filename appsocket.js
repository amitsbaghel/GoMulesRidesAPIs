var express = require('express');
var app=express();
var db=require('./db');

// I dont know if I need this.
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });

// created a http server.
var http = require('http').Server(app);

// message controller
// sent http reference to the messagecontroller module.
var MessageController=require('./controller/messageController')(http);

// message routing with socket. 
app.use('/message',MessageController);

module.exports=http;