const assert = require('assert');
// const bundle = require('socket.io-bundle');
// const ioPassport = require('socket.io-passport');

// const session = require('express-session')
// const cookieParser = require('cookie-parser');



module.exports = function setup(imports, done) {

    /*
        Imports
     */
    var io;
    var config = imports.config,
        sessionMiddleware = imports.middlewares.session,
        log = imports.log.create('socketserver'),
        auth = imports.auth,
        app = imports.app;

    var sharedSession = require("express-socket.io-session");

    /*
        Main Asserts
     */
    assert.ok(typeof config !== "undefined", "Config is not present");



    /*
        Begin module
     */

    log.info("Setting up socket server");

    // create socket server
    io = require('socket.io').listen(imports.http, {
        path: '/socket.io'
    });

    // export socket server
    imports.socket = io;

    //  SOCKET SHARED SESSION
    // =================================================================
    // Use shared session middleware for socket.io
    // setting autoSave:true
    io.use(sharedSession(sessionMiddleware, {
        autoSave: true
    }));


    // io.on('connection', function(client) {
    //     log.debug("Client connected");
    //     console.log('client', client.id, client.register);
    //     client.on('chat message', function(msg) {
    //         if (msg == "logout") {
    //             log.debug("logout");
    //             client.request.logout();
    //             client.request.session.destroy();
    //             client.disconnect();
    //             return;
    //         }
    //         log.debug("message received [" + client.id + "]:", msg)
    //         io.emit('chat message', msg);
    //     });
    // });

    done();

};
