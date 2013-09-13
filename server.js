#!/bin/env node
//  OpenShift sample Node application
var express = require('express');
var fs      = require('fs');
var io;

/**
 *  Define the sample application.
 */
var SampleApp = function() {

    //  Scope.
    var self = this;


    /*  ================================================================  */
    /*  Helper functions.                                                 */
    /*  ================================================================  */

    /**
     *  Set up server IP address and port # using env variables/defaults.
     */
    self.setupVariables = function() {
        //  Set the environment variables we need.
        self.ipaddress = process.env.OPENSHIFT_INTERNAL_IP || process.env.OPENSHIFT_NODEJS_IP;
        self.port      = process.env.OPENSHIFT_INTERNAL_PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080;

        if (typeof self.ipaddress === "undefined") {
            //  Log errors on OpenShift but continue w/ 127.0.0.1 - this
            //  allows us to run/test the app locally.
            console.warn('No OPENSHIFT_NODEJS_IP var, using 127.0.0.1');
            self.ipaddress = "127.0.0.1";
        };
    };


    /**
     *  Populate the cache.
     */
//    self.populateCache = function() {
//        if (typeof self.zcache === "undefined") {
//            self.zcache = { 'index.html': '' };
//        }

        //  Local cache for static content.
//        self.zcache['index.html'] = fs.readFileSync('./index.html');
//    };


    /**
     *  Retrieve entry (content) from cache.
     *  @param {string} key  Key identifying content to retrieve from cache.
     */
    self.cache_get = function(key) { return self.zcache[key]; };


    /**
     *  terminator === the termination handler
     *  Terminate server on receipt of the specified signal.
     *  @param {string} sig  Signal to terminate on.
     */
    self.terminator = function(sig){
        if (typeof sig === "string") {
           console.log('%s: Received %s - terminating sample app ...',
                       Date(Date.now()), sig);
           process.exit(1);
        }
        console.log('%s: Node server stopped.', Date(Date.now()) );
    };


    /**
     *  Setup termination handlers (for exit and a list of signals).
     */
    self.setupTerminationHandlers = function(){
        //  Process on exit and signals.
        process.on('exit', function() { self.terminator(); });

        // Removed 'SIGPIPE' from the list - bugz 852598.
        ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
         'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
        ].forEach(function(element, index, array) {
            process.on(element, function() { self.terminator(element); });
        });
    };

    self.setTemplateEngine = function() {

    };


    /*  ================================================================  */
    /*  App server functions (main app logic here).                       */
    /*  ================================================================  */

    /**
     *  Create the routing table entries + handlers for the application.
     */
    self.createRoutes = function() {
        self.routes = { };

        // Routes for /health, /asciimo, /env and /
        self.routes['/health'] = function(req, res) {
            res.send('1');
        };

        self.routes['/asciimo'] = function(req, res) {
            var link = "http://i.imgur.com/kmbjB.png";
            res.send("<html><body><img src='" + link + "'></body></html>");
        };

        self.routes['/env'] = function(req, res) {
            var content = 'Version: ' + process.version + '\n<br/>\n' +
                          'Env: {<br/>\n<pre>';
            //  Add env entries.
            for (var k in process.env) {
               content += '   ' + k + ': ' + process.env[k] + '\n';
            }
            content += '}\n</pre><br/>\n'
            res.send(content);
            res.send('<html>\n' +
                     '  <head><title>Node.js Process Env</title></head>\n' +
                     '  <body>\n<br/>\n' + content + '</body>\n</html>');
        };

//        self.routes['/'] = function(req, res) {
//            res.set('Content-Type', 'text/html');
//            res.send(self.cache_get('index.html') );
//        };

        // another test route
        self.routes['/'] = function(req, res){
            res.render('page'); // page.jade is our template
        };

    };


    /**
     *  Initialize the server (express) and create the routes and register
     *  the handlers.
     */
    self.initializeServer = function() {
        self.createRoutes();
        self.app = express();

        // Use Jade with ExpressJS
        self.app.set('views', __dirname + '/tpl');
        self.app.set('view engine', 'jade');
        self.app.engine('jade', require('jade').__express);

        //  Add handlers for the app (from the routes).
        for (var r in self.routes) {
            self.app.get(r, self.routes[r]);
        }

        self.app.use(express.static(__dirname + '/public'));               
    };


    /**
     *  Initializes the sample application.
     */
    self.initialize = function() {
        self.setupVariables();
//        self.populateCache();
        self.setupTerminationHandlers();

        // Create the express server and routes.
        self.initializeServer();     
    };


    /**
     *  Start the server (starts up the sample application).
     */
    self.start = function() {

        // We pass the express server to socket.io
        io = require('socket.io').listen(
          self.app.listen(self.port, self.ipaddress, function() {
                    console.log('%s: Node server started on %s:%d ...',
                            Date(Date.now()), self.ipaddress, self.port);
            }));

        io.sockets.on('connection', function (socket) { // socket is the client's socket, the junction between the server and the user's browser.

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
                // In theory it should be like sending both a broadcast and a socket.emit.
            });

            socket.on('disconnect', function () {
                socket.get('nickname', function(err, name) {
                    socket.broadcast.emit('disconnected', { name: name });
                });
            });
        });

    };

};   /*  Sample Application.  */



/**
 *  main():  Main code.
 */
var zapp = new SampleApp();
zapp.initialize();
zapp.start();
