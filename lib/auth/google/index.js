'use strict'

var express = require('express')
var router = express.Router()
var passport = require('passport')
const url = require('url')

module.exports = function setup (imports) {
  var app = imports.app
  var config = imports.config

  // export Strategy
  require('./passport')(imports)

  // var auth = require('../auth.service')
  var auth = imports.auth

  // export route
  imports.auth.routes.google = router

  // router.use('*', function (req, res, next) {
  //   new FacebookPassportConfig(req, res)
  //   next()
  // })

  // Redirect the user to Facebook for authentication.  When complete,
  // Facebook will redirect the user back to the application at
  //     /auth/facebook/callback
  router.get('/', passport.authenticate('google', {
    scope: ['email', 'profile'],
    session: false
  }))

  router.get('/logout', function(req, res, next){
    req.session.destroy()
    req.logout()
    res.redirect('/')
  })

  // if (error) return res.status(401).json(error)
  // Facebook will redirect the user to this URL after approval.  Finish the
  // authentication process by attempting to obtain an access token.  If
  // access was granted, the user will be logged in.  Otherwise,
  // authentication has failed.
  router.get('/callback', function (req, res, next) {
    passport.authenticate('google', function (err, user, info) {
      var error = err || info

      if (err) return res.status(401).json(err)
      if (!user) return res.status(404).json({message: 'Something went wrong, please try again.'})

      // create token for user
      var token = auth.signToken(user._id, user.role)
      // save token on session
      req.session.access_token = token

      // make login on passport
      req.logIn(user, function (err) {
        if (err) { return next(err) }
        app.emit('passport.google.login', {token: token, user, user, req: req})
        // redirect to successURL configured on your config env
        if (config.strategies.google.successURL) {
          // return res.redirect(url.resolve(config.strategies.google.successURL, '?token=' + token))
          return res.redirect(config.strategies.google.successURL)
        }
        // return res.redirect('/users/' + user.username)
        return res.json({
          token: token
        })
      })

      // res.json({
      //   token: token
      // })
    })(req, res, next)
    // passport.authenticate('google', {
    //   failureRedirect: '/login',
    //   session: false
    // })(req, res, next)
  })
}
