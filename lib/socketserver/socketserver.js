module.exports = function setup (imports, done) {
  /*
      Imports
   */
  var io
  var config = imports.config
  var sessionMiddleware = imports.middlewares.session
  var log = imports.log.create('socketserver')
  var sharedSession = require('express-socket.io-session')
  const assert = require('assert')

  /*
      Main Asserts
   */
  assert.ok(typeof config !== 'undefined', 'Config is not present')

  /*
      Begin module
   */

  log.info('Setting up socket server')

  // create socket server
  io = require('socket.io').listen(imports.http, {
    path: '/socket.io'
  })

  // export socket server
  imports.socket = io

  //  SOCKET SHARED SESSION
  // =================================================================
  // Use shared session middleware for socket.io
  // setting autoSave:true
  io.use(sharedSession(sessionMiddleware, {
    autoSave: true
  }))

  done()
}
