/***** SERVER *****/

var express = require("express"),
    app = express(),
    port = 1337;

app.use(express.static(__dirname + '/public'));

// We pass the express server to socket.io
var io = require('socket.io').listen(app.listen(port));

io.sockets.on('connection', function (socket) { // socket is the client's socket, the junction between the server and the user's browser.

    // Quick reference:
//    socket.emit(): emits to you only.
//    socket.broadcast.emit(): emits to all, but not you.
//    io.sockets.emit(): emits to all sockets.

    socket.emit('connected', { id: socket.id });

    socket.on('recognizing user', function (user) {

        socket.set('nickname', user.name, function () {
            socket.broadcast.emit('user recognized', user);
            socket.emit('user recognized', user);
        });
    });

    socket.on('set nickname', function (user) {
        socket.set('nickname', user.newName, function () {
            socket.broadcast.emit('nickname set', user);
            socket.emit('nickname set', user);
        });
    });

    socket.on('writing', function (data) {
        // To broadcast, simply add a `broadcast` flag to `emit`
        // and `send` method calls. Broadcasting means sending a
        // message to everyone else except for the socket that starts it.
        this.broadcast.emit('written', data);
    });

    socket.on('send message', function (data) {
        // forward the data sent by the user to all other sockets
        io.sockets.emit('message', data);
        // Note: io.sockets.emit() !== socket.emit()
        // In theory it should be like sending a broadcast and a socket.emit.
    });

    socket.on('disconnect', function () {

        socket.get('nickname', function(err, name) {
            socket.broadcast.emit('disconnected', { name: name });
        });
    });
});

console.log("Listening on port " + port);

//////////////////////////////////////////

// Use Jade with ExpressJS
app.set('views', __dirname + '/tpl');
app.set('view engine', 'jade');
app.engine('jade', require('jade').__express);

// main route
app.get('/', function(req, res){
    res.render('page'); // page.jade is our template
});

// test route (Express)
//app.get('/hello.txt', function(req, res){
//  var body = 'Hello World';
//  res.setHeader('Content-Type', 'text/plain');
//  res.setHeader('Content-Length', body.length);
//  var foo = require('./public/foo.json');
//  console.log(foo);
//  res.end(body);
//});

// another test route
//app.get("/", function(req, res){
//    res.send("It works!");
//});
