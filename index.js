
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

    //console.log(socket);

    // socket is the client's socket,
    // the junction between the server and the user's browser.
    var systemFirstMessage = {
    	name: 'Server',
    	text: 'welcome to the chat!',
    	type: 0
    };
    socket.emit('message', systemFirstMessage);
    
    socket.on('writing', function (data) {
        // To broadcast, simply add a `broadcast` flag to `emit`
        // and `send` method calls. Broadcasting means sending a
        // message to everyone else except for the socket that starts it.
        this.broadcast.emit('broadcasting', data);
    });

    //socket.broadcast.emit('just a test BROADCAST', 'ARGOMENTO');

    socket.on('send', function (data) {
        // forward the data sent by the user to all other sockets
        //console.log("MESSAGE SENT: " + JSON.stringify(data));
        io.sockets.emit('message', data);
    });
});

console.log("Listening on port " + port);



//////////////////////////////////////////

// Use Jade with ExpressJS
app.set('views', __dirname + '/tpl');
app.set('view engine', "jade");
app.engine('jade', require('jade').__express);
app.get("/", function(req, res){
    res.render("page");
});


