#!/bin/env node
//  OpenShift sample Node application
var express = require('express');
var fs      = require('fs');

var database = require('./routes/database');

var mongodb = require('mongodb');

var sendError = function(req, res, status, message, closeAndEnd, consoleLogSpecific){
    console.log(consoleLogSpecific || message);
    res.send(status, {errorMessage:message});
    next();
}

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
        self.ipaddress = process.env.OPENSHIFT_NODEJS_IP;
        self.port      = process.env.OPENSHIFT_NODEJS_PORT || 8085;

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
    self.populateCache = function() {
        if (typeof self.zcache === "undefined") {
            self.zcache = { 'index.html': '' };
        }

        //  Local cache for static content.
        self.zcache['index.html'] = fs.readFileSync('./index.html');
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


    /*  ================================================================  */
    /*  App server functions (main app logic here).                       */
    /*  ================================================================  */

    /**
     *  Create the routing table entries + handlers for the application.
     */

    /**
        Medicine object{ 
                         id: int
                         user: string name 
                         string date: new Date 
                         repeat: boolean 
                         days: [ ] 
                         taken: boolean 
                        } 
        Settings object{ 
                         id: int
                         user: string 
                         enableNotifications: boolean 
                         time: string 
                         confirmationEmail: string 
                        }
    */ 
    self.createRoutes = function() {
        self.routes = { };

        self.routes['saveMedicine'] = function(req, res, next) {
            //create the object that will be sent to endpoint
            var newMedicine = {};   

            var medicinesCollection = req.db.collection('medicines');
            medicinesCollection.insert(newMedicine, function(err, result){
                if(err)
                    sendError(req, res, 500, "error on inserting a new medicine object", false);
                else{
                    res.send(200, result);
                    next();
                }
                req.db.close();
                res.end();
            });
        };

        self.routes['saveSettings'] = function(req, res, next) {
            var settingsObject = {};   

            var settingsCollection = req.db.collection('settings');
            settingsCollection.insert(newMedicsettingsObjectine, function(err, result){
                if(err)
                    sendError(req, res, 500, "error on inserting a new settings object", false);
                else{
                    res.send(200, result);
                    next();
                }
                req.db.close();
                res.end();
            });
        };

        self.routes['getMedicines'] = function(req, res, next) {
            //get the user
            var user = "";
            var medicinesCollection = req.db.collection('medicines');
            medicinesCollection.find({"user": user}).toArray(function(err, medicines){
                if(err)
                    sendError(req, res, 500, "error getting medicines", false);
                else{
                    res.json(200, medicines);
                    next();
                }
                req.db.close();
                res.end();
            });
        };

        self.routes['deleteMedicine'] = function(req, res, next) {

            var medicinesCollection = req.db.collection('medicines');
            medicinesCollection.remove({}).toArray(function(err, result){
                if(err)
                    sendError(req, res, 500, "error deleting medicine", false);
                else{
                    res.send(200, result);
                    next();
                }
                req.db.close();
                res.end();
            });
        };
    };


    /**
     *  Initialize the server (express) and create the routes and register
     *  the handlers.
     */
    self.initializeServer = function() {
        self.createRoutes();
        self.app = express();

        self.app.all('*', function(req, res, next){
            res.setHeader('Content-Type', 'application/json');
            // this keeps chrome from crying about cross origin access
            res.header("Access-Control-Allow-Origin", "*");
            res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
            res.header("Access-Control-Allow-Headers", "Content-Type");
            if ('OPTIONS' == req.method){
                console.log('options hit');
                res.send(200);
                res.end();
            }else
                next();
        });

        self.app.all('*', database.getDbConnection);// creates db connection and saves it to req.db

        self.app.post("/saveMedicine", self.routes['saveMedicine']);
        self.app.post("/saveSettings", self.routes['saveSettings']);
        self.app.get("/getMedicines", self.routes['getMedicines']);
        self.app.delete("/deleteMedicine", self.routes['deleteMedicine']);

        self.app.all("*", database.closeAll);// does db.close() and res.end()
    };


    /**
     *  Initializes the sample application.
     */
    self.initialize = function() {
        self.setupVariables();
        self.populateCache();
        self.setupTerminationHandlers();

        // Create the express server and routes.
        self.initializeServer();
    };


    /**
     *  Start the server (starts up the sample application).
     */
    self.start = function() {
        //  Start the app on the specific interface (and port).
        self.app.listen(self.port, self.ipaddress, function() {
            console.log('%s: Node server started on %s:%d ...',
                        Date(Date.now() ), self.ipaddress, self.port);
        });
    };

};   /*  Sample Application.  */



/**
 *  main():  Main code.
 */
var zapp = new SampleApp();
zapp.initialize();
zapp.start();



















