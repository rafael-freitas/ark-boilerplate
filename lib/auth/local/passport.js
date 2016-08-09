'use strict'

// var User          = require('../../user/user.model')
var passport = require('passport')
var LocalStrategy = require('passport-local').Strategy

module.exports = function (imports) {
  var User = imports.models.User

  passport.serializeUser((user, done) => {
    console.log('serializeUser', user)
    done(null, user._id)
  })

  passport.deserializeUser((id, done) => {
    User.findById(id, (err, user) => {
      done(err, user)
    })
  })

  passport.use(new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password'
  },
    function (username, password, done) {
      User.findOne({
        $or: [{username: username}, {email: username}]
      }, function (err, user) {
        if (err) return done(err)

        if (!user) {
          return done(null, false, {
            message: 'Incorrect username or password.'
          })
        }

        if (!user.validPassword(password)) {
          return done(null, false, {
            message: 'Incorrect username or password.'
          })
        }

        return done(null, user)
      })
    }
  ))
}
