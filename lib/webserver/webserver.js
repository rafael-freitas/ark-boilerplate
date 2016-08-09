const express = require('express')
const http = require('http')
const https = require('https')
const assert = require('assert')
const fs = require('fs')

module.exports = function setup (imports, done) {
  /*
      Imports
   */
  var app = express()
  var config = imports.config
  var log = imports.log.create('webserver')

  /*
      Exports
   */
  imports.app = app

  /*
      Main Asserts
   */
  assert.ok(typeof config !== 'undefined', 'Config is not present')

  /*
      Begin module
   */
  var port = normalizePort(config.http.port)
  app.set('port', port)

  /**
   * config static folder
   * @param  {String} a folder
   * @param  {String} b folder
   */
  app.useStatic = function (a, b) {
    if (typeof b === 'undefined') {
      this.use(express.static(a))
    } else {
      this.use(a, express.static(b))
    }
  }

  this.loadPlugin('./config/express', () => {
    done()
  })

  /**
   * Create HTTP server.
   */

  var httpServer = http.createServer(app)
  httpServer.on('error', onError)
  httpServer.on('listening', onListening)

  httpServer.listen(port)
  imports.http = httpServer // exports

  /*
      Create HTTPS Server
   */
  if (config.https && config.https.port) {
    var httpsOptions = {
      key: fs.readFileSync(config.https.ssl.key),
      cert: fs.readFileSync(config.https.ssl.cert),
      ca: fs.readFileSync(config.https.ssl.ca)
    }

    var httpsServer = https.createServer(httpsOptions, app)
    httpsServer.listen(config.https.port)
    httpsServer.on('error', onError)
    httpsServer.on('listening', onListening)
    imports.https = httpServer
  }

  /**
   * Event listener for HTTP server "error" event.
   */

  function onError (error) {
    if (error.syscall !== 'listen') {
      throw error
    }

    var bind = typeof port === 'string'
      ? 'Pipe ' + port
      : 'Port ' + port

    // handle specific listen errors with friendly messages
    switch (error.code) {
      case 'EACCES':
        log.error(bind + ' requires elevated privileges')
        log.exit(1)
        break
      case 'EADDRINUSE':
        // console.error(bind + ' is already in use')
        log.error(log.colors.warn(bind) + ' is already in use')
        log.exit(1)
        break
      default:
        throw error
    }
  }

  /**
   * Event listener for HTTP server "listening" event.
   */

  function onListening () {
    var addr = httpServer.address()
    var bind = typeof addr === 'string'
      ? 'pipe ' + addr
      : 'port ' + addr.port

    log.info('Listening on ' + log.colors.green(bind))
  }

  /**
   * Normalize a port into a number, string, or false.
   */

  function normalizePort (val) {
    var port = parseInt(val, 10)

    if (isNaN(port)) {
      // named pipe
      return val
    }

    if (port >= 0) {
      // port number
      return port
    }

    return false
  }
}
