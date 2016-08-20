// var User                = require('../../user/user.model')
var FACEBOOK_APP_ID = require('../../../config').fbAppID
var FACEBOOK_APP_SECRET = require('../../../config').fbAppSecret
var URLcallback = require('../../../config').URL
var passport = require('passport')
var FacebookStrategy = require('passport-facebook').Strategy
var auth = require('../auth.service')
var helpers = require('../../../helpers.js')

module.exports = function (imports) {}

module.exports = function (req, res) {
  passport.use(new FacebookStrategy({
    clientID: FACEBOOK_APP_ID,
    clientSecret: FACEBOOK_APP_SECRET,
    callbackURL: URLcallback + '/api/auth/facebook/callback'
  },
    function (accessToken, refreshToken, profile, done) {
      User.findOne({'facebook.id': profile.id}, function (err, user) {
        if (err) { return done(err); }
        var email = helpers.makeId(5) + '@noemail.com'
        if (profile.email) email = profile.email

        if (!user) {
          var newuser = new User({
            username: profile.id,
            password: helpers.makeId(10),
            email: email,
            facebook: profile
          })
          newuser.username = newuser.username.toLowerCase()
          newuser.role = 'user'

          return newuser.save(function (err) {
            if (err) return res.status(500).send(err)
            return res.redirect('/token/' + auth.signToken(newuser._id, newuser.role))
          })
        }

        user.facebook = profile

        user.save(function (err, user) {
          res.redirect('/token/' + auth.signToken(user._id, user.role))
        })
      })
    }
  ))
}
