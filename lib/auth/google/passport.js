'use strict'

module.exports = function (imports) {
  var passport = require('passport')
  var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy
  var User = imports.models.User
  var config = imports.config

  passport.serializeUser((user, done) => {
    // console.log('serializeUser', user)
    done(null, user._id)
  })

  passport.deserializeUser((id, done) => {
    User.findById(id, (err, user) => {
      done(err, user)
    })
  })

  // =========================================================================
  // GOOGLE ==================================================================
  // =========================================================================
  passport.use(new GoogleStrategy({
    clientID: config.strategies.google.clientID,
    clientSecret: config.strategies.google.clientSecret,
    callbackURL: config.strategies.google.callbackURL
  },
    function (token, refreshToken, profile, done) {

      // make the code asynchronous
      // User.findOne won't fire until we have all our data back from Google
      process.nextTick(function () {
        // console.log('google profile', profile);

        // try to find the user based on their google id
        User.findOne({ 'google.id': profile.id }, function (err, user) {
          if (err)
            return done(err)

          if (user) {
            // if a user is found, log them in

            // first update your avatar pic

            if (Array.isArray(profile.photos) && typeof profile.photos[0] !== 'undefined') {
              if (!user.google) {
                user.google = {}
              }
              user.google.photos = profile.photos
              user.avatar = profile.photos[0].value // pull the first photo
              user.save() //updating
            }
            return done(null, user)
          } else {
            // if the user isnt in our database, create a new user
            var newUser = new User()

            // set all of the relevant information
            newUser.google = {}
            newUser.google.id = profile.id
            newUser.google.token = token
            newUser.google.name = profile.displayName
            newUser.google.email = profile.emails[0].value // pull the first email
            if (Array.isArray(profile.photos) && typeof profile.photos[0] !== 'undefined') {
              newUser.google.photos = profile.photos // pull the first photo
            }


            // copy profile to main User structure
            newUser.username = newUser.google.email
            newUser.email = profile.emails[0].value
            newUser.password = (new Date()).getTime() + profile.id
            newUser.name = profile.displayName
            if (Array.isArray(profile.photos) && typeof profile.photos[0] !== 'undefined') {
              newUser.avatar = profile.photos[0].value
            }


            // save the user
            newUser.save(function (err) {
              if (err)
                throw err
              return done(null, newUser)
            })
          }
        })
      })
    }))
}
