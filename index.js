
/***** SERVER *****/

var express = require("express");
var app = express();
var port = 3700;

//var _ = require("underscore");

//app.get("/", function(req, res){
//    res.send("It works2!");
//});

app.use(express.static(__dirname + '/public'));

//app.listen(port);
// We pass the express server to socket.io
var io = require('socket.io').listen(app.listen(port));

///////////////////////////////////////////////////

// Socket.io connection handler
io.sockets.on('connection', function (socket) {
    // socket is the client's socket,
    // the junction between the server and the user's browser.
    var systemFirstMessage = {
    	name: 'Server',
    	text: 'welcome to the chat!',
    	type: 0
    };
    socket.emit('message', systemFirstMessage);

    socket.on('send', function (data) {
        // forward the data sent by the user to all other sockets
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


