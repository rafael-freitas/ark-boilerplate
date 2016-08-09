'use strict'

const express = require('express')
const passport = require('passport')
var router = express.Router()

// router.use('/local', require('./local'))
//
// router.use('/facebook', require('./facebook'))

module.exports = function setup (imports, done) {
  // express app
  var app = imports.app
  // var config = imports.config

  // return done()

  app.use(passport.initialize())
  app.use(passport.session())

  // exports auth
  imports.auth = {
    routes: {}
  }

  // export auth interface
  require('./auth.service')(imports)

  this.loadPlugin('lib/auth/local')
  // this.loadPlugin("lib/auth/facebook")

  // var dirs = imports.util.path.getDirectories(__dirname)
  // for (dir of dirs) {
  //     this.loadPlugin("lib/auth/"+dir)
  //     // require(dir)(imports)
  // }
  done()
}
