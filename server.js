#!/bin/env node

var express = require('express')
  , fs = require('fs')
  , io
  , MongoClient = require('mongodb').MongoClient
  , MONGODB_ITEMS_TO_LOAD_LIMIT = 50

var MyApp = function() {

    var self = this;

    // ## Helper functions

    // Set up server IP address and port # using env variables/defaults.
    self.setupVariables = function() {
        self.appname = process.env.OPENSHIFT_APP_NAME || 'rtwc';
        self.ipaddress = process.env.OPENSHIFT_INTERNAL_IP || process.env.OPENSHIFT_NODEJS_IP;
        self.port = process.env.OPENSHIFT_INTERNAL_PORT || process.env.OPENSHIFT_NODEJS_PORT || 8000;
        self.dbport = process.env.OPENSHIFT_MONGODB_DB_PORT || 27017;
        self.dbname = self.appname;

        if (typeof self.ipaddress === 'undefined') {
            // Log errors on OpenShift but continue w/ 127.0.0.1 - this
            // allows us to run/test the app locally.
            console.warn('No OPENSHIFT_NODEJS_IP var, using 127.0.0.1');
            self.ipaddress = '127.0.0.1';
        };

        // if OPENSHIFT env variables are present, use the available connection info:
        if (process.env.OPENSHIFT_MONGODB_DB_PASSWORD) {
          console.log('We are in OpenShift');
          self.connection_string = process.env.OPENSHIFT_MONGODB_DB_USERNAME + ':' +
          process.env.OPENSHIFT_MONGODB_DB_PASSWORD + '@' +
          process.env.OPENSHIFT_MONGODB_DB_HOST + ':' +
          self.dbport + '/' +
          self.dbname;
        } else {
          // default to a 'localhost' configuration:
          console.log('We are in localhost');
          self.connection_string = 'admin:VVkkGUKNh2by@' + self.ipaddress + ':' + self.dbport + '/' + self.dbname;
        }
    };


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
        if (typeof sig === 'string') {
           console.log('%s: Received %s - terminating sample app ...',
                       Date(Date.now()), sig);
           process.exit(1);
        };
        console.log('%s: Node server stopped.', Date(Date.now()) );
    };


    /**
     *  Setup termination handlers (for exit and a list of signals).
     */
    self.setupTerminationHandlers = function(){
        //  Process on exit and signals.
        process.on('exit', function() { self.terminator(); });

        ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
         'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
        ].forEach(function(element, index, array) {
            process.on(element, function() { self.terminator(element); });
        });
    };


    // ## App server functions
    // business logic goes here.

    /**
     *  Create the routing table entries + handlers for the application.
     */
    self.createRoutes = function() {
        self.routes = {};

        // main route
        self.routes['/'] = function(req, res){
            res.render('page'); // page.jade is our template
        };
    };


    /**
     *  Initialize the server (express), create the routes and register
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
        self.app.use('/docs', express.static(__dirname + '/docs'));
    };


    /**
     *  Initializes the sample application.
     */
    self.initialize = function() {
        self.setupVariables();
        self.setupTerminationHandlers();
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

        // socket is the junction between the server and the user's browser.
        io.sockets.on('connection', function (socket) {

            // ###### Socket.io cheat sheet:
            //  - socket.emit()             emits to you only.
            //  - socket.broadcast.emit()   emits to all, but not you.
            //  - io.sockets.emit()         emits to all sockets. NO, not exactly.
            // It means: all sockets will emit this!

            // 1) Every time a client connects,
            //    we send the Socket ID to him.
            socket.emit('connected', {id: socket.id});
            console.log('Socket with ID %s connected on %s',
                socket.id, new Date());

            // 2) Let's see if the user is newish.
            socket.on('recognizing user', function (user) {
                socket.set('nickname', user.name);
                socket.emit('user recognized', user);
            });

            // 3) Load the most recent messages for the
            //    user that has been connected.
            MongoClient.connect('mongodb://'+self.connection_string, function(err, db) {
                if(err) throw err;
                db.collection('messages').find().sort({$natural: -1}).limit(MONGODB_ITEMS_TO_LOAD_LIMIT).toArray(function(err, docs) {
                    if(err) throw err;
                    // send the recent messages to the client
                    socket.emit('messages loaded', docs.reverse());
                    db.close();
                });
            });

            socket.on('set nickname', function (user) {
                socket.set('nickname', user.newName, function () {
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

                // save the data
                MongoClient.connect('mongodb://'+self.connection_string, function(err, db) {
                  if(err) throw err;
                  db.collection('messages').insert(data, {w:1}, function(err, result) {
                    if(err) throw err;
                    console.log('Message saved:');
                    console.log(data);
                    db.close();
                  });
                });
            });

            socket.on('disconnect', function () {
                socket.get('nickname', function(err, name) {
                    if(err) throw err;
                    socket.emit('disconnected', {
                        id: socket.id,
                        name: name
                    });
                    console.log('%s (%s) disconnected. %s', name, socket.id, new Date());
                });
            });
        });

    };

};   /*  End of application.  */


/**
 *  main():  Main code.
 */
var server = new MyApp();
server.initialize();
server.start();
