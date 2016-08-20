'use strict'

var express = require('express')
var router = express.Router()
var passport = require('passport')
var FacebookPassportConfig = require('./passport')

router.use('*', function (req, res, next) {
  new FacebookPassportConfig(req, res)
  next()
})

// Redirect the user to Facebook for authentication.  When complete,
// Facebook will redirect the user back to the application at
//     /auth/facebook/callback
router.get('/', passport.authenticate('facebook', {
  scope: ['email', 'user_about_me'],
  session: false
}))

// Facebook will redirect the user to this URL after approval.  Finish the
// authentication process by attempting to obtain an access token.  If
// access was granted, the user will be logged in.  Otherwise,
// authentication has failed.
router.get('/callback', function (req, res, next) {
  passport.authenticate('facebook', {
    failureRedirect: '/login',
    session: false
  })(req, res)
})

module.exports = router
