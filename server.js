
/***** SERVER *****/

var express = require("express"),
    app = express(),
    port = 1337;

// This is how we use external libs
//var _ = require("underscore");
//var $ = require('jquery');

// Just a test route (Express)
//app.get("/", function(req, res){
//    res.send("It works!");
//});

app.use(express.static(__dirname + '/public'));

// app.listen(port);
// We pass the express server to socket.io
var io = require('socket.io').listen(app.listen(port));

///////////////////////////////////////////////////

// Socket.io connection handler
io.sockets.on('connection', function (socket) {

    //console.log(socket);
    //console.log(window); this is of course not available in the server's side

    // socket is the client's socket,
    // the junction between the server and the user's browser.

    // This is the welcome message, from Server:
    socket.emit('message', {
        name: 'Server',
        text: 'welcome to the chat!',
        type: 0,
        time: (new Date()).getTime()
    });

    socket.emit('connected', { id: socket.id });

    socket.on('set nickname', function (name) {
        socket.set('nickname', name, function () {
            socket.broadcast.emit('nickname set', { name: name });
        });
    });

    socket.on('writing', function (data) {
        // To broadcast, simply add a `broadcast` flag to `emit`
        // and `send` method calls. Broadcasting means sending a
        // message to everyone else except for the socket that starts it.
        this.broadcast.emit('written', data);
    });

    socket.on('send', function (data) {
        // forward the data sent by the user to all other sockets
        //console.log("MESSAGE SENT: " + JSON.stringify(data));
        io.sockets.emit('message', data);
    });

    socket.on('disconnect', function () {
        console.log('A socket just disconnected.');

        socket.get('nickname', function(err, name) {
            socket.broadcast.emit('disconnected', { 
                id: this.id,
                name: name
            });
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

// test route
app.get('/hello.txt', function(req, res){
  var body = 'Hello World';
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Length', body.length);

  var foo = require('./public/foo.json');
  console.log(foo);

  res.end(body);
});


