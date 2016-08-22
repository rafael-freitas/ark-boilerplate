'use strict'

var express = require('express')
var router = express.Router()
var passport = require('passport')

module.exports = function setup (imports) {
  // export Strategy
  require('./passport')(imports)

  // var auth = require('../auth.service')
  var auth = imports.auth

  // export route
  imports.auth.routes.local = router


  // validate token
  router.post('/token', function (req, res, next) {
    var token = req.body.token || {}
    // console.log('token', token);
    try {
      if (auth.verifyToken(token) !== null) {
        return res.json({
          token: token
        })
      }
    } catch (err) {
      return res.status(401).json(err)
    }

    // return next(err)
  })

  router.post('/', function (req, res, next) {
    passport.authenticate('local', function (err, user, info) {
      var error = err || info
      if (error) return res.status(401).json(error)
      if (!user) return res.status(404).json({message: 'Something went wrong, please try again.'})

      // create token for user
      var token = auth.signToken(user._id, user.role)
      // save token on session
      req.session.access_token = token

      // make login on passport
      req.logIn(user, function (err) {
        if (err) { return next(err) }
        // return res.redirect('/users/' + user.username)
        return res.json({
          token: token
        })
      })

      // res.json({
      //   token: token
      // })
    })(req, res, next)
  })
}
