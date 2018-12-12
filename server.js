var app= require('./app');
var port=process.env.port||3000;

var server=app.listen(port,function(){
console.log('Express server listening on port '+port)
});

// followed this tutorial
// https://hackernoon.com/restful-api-design-with-node-js-26ccf66eab09

// here code for websocket.
var appsocket= require('./appsocket');
var portsocket=process.env.port||5000;

var socketserver=appsocket.listen(portsocket,function(){
console.log('socket server listening on port '+portsocket)
});