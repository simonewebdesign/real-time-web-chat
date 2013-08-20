
/***** SERVER *****/

var express = require("express"),
    app = express(),
    port = 1337;

//var _ = require("underscore");

//app.get("/", function(req, res){
//    res.send("It works2!");
//});

app.use(express.static(__dirname + '/public'));

//app.listen(port);
// We pass the express server to socket.io
var io = require('socket.io').listen(app.listen(port));

// we want to use jQuery
//var $ = require('jquery');

///////////////////////////////////////////////////

// Socket.io connection handler
io.sockets.on('connection', function (socket) {

    console.log(socket);

    // socket is the client's socket,
    // the junction between the server and the user's browser.
    var systemFirstMessage = {
    	name: 'Server',
    	text: 'welcome to the chat!',
    	type: 0,
        time: (new Date()).getTime()
    };
    socket.emit('message', systemFirstMessage);
    
    // sending a message to everyone else except for the socket that starts it,
    // to let everyone know that this current socket/user is now online
    socket.broadcast.emit('connected', { id: socket.id });

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
        io.sockets.emit('disconnected', { id: this.id });
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


