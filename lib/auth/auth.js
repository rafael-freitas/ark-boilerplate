'use strict'

const express = require('express')
const passport = require('passport')
var router = express.Router()

module.exports = function setup (imports, done) {
  // express app
  var app = imports.app
  var config = imports.config

  // return done()

  app.use(passport.initialize())
  app.use(passport.session())

  // exports auth
  imports.auth = {
    routes: {
      auth: router
    }
  }

  // export auth interface
  require('./auth.service')(imports)

  this.loadPlugin('lib/auth/local')
  this.loadPlugin("lib/auth/google")

  router.get('/logout', function(req, res, next){
    req.session.destroy()
    req.logout()
    res.redirect(config.logoutRedirectUrl || '/')
  })

  router.get('/session', imports.auth.isAuthenticated(), function(req, res, next){
    // console.log('req.user', req.user);
    if (!req.user || typeof req.user.profile !== 'function') {
      // destroy session if the user not to be in database
      req.session.destroy()
      req.logout()
      return res.status(403).json({messae: 'User not exists'})
    }
    var response = {
      session: req.session.id,
      token: req.session.access_token,
      account: req.user.profile()
    }
    return res.json(response)
  })
  // this.loadPlugin("lib/auth/token")

  done()
}
