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
        self.appname = process.env.OPENSHIFT_APP_NAME || 'rtwc';
        self.ipaddress = process.env.OPENSHIFT_INTERNAL_IP || process.env.OPENSHIFT_NODEJS_IP;
        self.port = process.env.OPENSHIFT_INTERNAL_PORT || process.env.OPENSHIFT_NODEJS_PORT || 8081;
        self.dbport = process.env.OPENSHIFT_MONGODB_DB_PORT || 27017;
        self.dbname = self.appname;

        if (typeof self.ipaddress === "undefined") {
            //  Log errors on OpenShift but continue w/ 127.0.0.1 - this
            //  allows us to run/test the app locally.
            console.warn('No OPENSHIFT_NODEJS_IP var, using 127.0.0.1');
            self.ipaddress = "127.0.0.1";
        }

        // default to a 'localhost' configuration:
        self.connection_string = self.ipaddress + ':' + self.dbport + '/' + self.dbname;
        // if OPENSHIFT env variables are present, use the available connection info:
        if (process.env.OPENSHIFT_MONGODB_DB_PASSWORD) {
          self.connection_string = process.env.OPENSHIFT_MONGODB_DB_USERNAME + ":" +
          process.env.OPENSHIFT_MONGODB_DB_PASSWORD + "@" +
          process.env.OPENSHIFT_MONGODB_DB_HOST + ':' +
          self.dbport + '/' +
          self.dbname;
        }
        console.log(self.connection_string);

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

        // main route
        self.routes['/'] = function(req, res){
            res.render('page'); // page.jade is our template
        };

    };

    self.loadDataFromDatabase = function() {
        //load the Client interface
        var MongoClient = require('mongodb').MongoClient;
        // the client db connection scope is wrapped in a callback:
        MongoClient.connect('mongodb://' + self.connection_string, function(err, db) {
          if(err) throw err;
          var collection = db.collection('messages').find().limit(10).toArray(function(err, docs) {
            console.log("MESSAGES (FIRST 10):");
            if(err) throw err;
            console.log(docs);
            db.close();
          })
        })
    }

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

        // Load messages
        self.loadDataFromDatabase();
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

            //  Socket.io cheat sheet:
            //    socket.emit()             emits to you only.
            //    socket.broadcast.emit()   emits to all, but not you.
            //    io.sockets.emit()         emits to all sockets.

            // 1) Every time a client connects, 
            //    we send the Socket ID to him.
            socket.emit('connected', {id: socket.id});
            console.log("Socket with ID %s connected on %s", 
                socket.id, new Date());

            // 2) Let's see if the user is newish.
            socket.on('recognizing user', function (user) {

                if (user.isNewish) {
                    socket.set('nickname', user.name);
                }
                
                io.sockets.emit('user recognized', user);

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
                    socket.broadcast.emit('disconnected', {
                        id: socket.id,
                        name: name 
                    });
                    console.log("%s (%s) disconnected. %s", name, socket.id, new Date());
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
