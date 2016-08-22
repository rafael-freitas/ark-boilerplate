'use strict'

var jwt = require('jsonwebtoken')
var expressJwt = require('express-jwt')
var compose = require('composable-middleware')

module.exports = function setup (imports) {
  var config = imports.config
  var User = imports.models.User
  var log = imports.log.create('auth.service')

  var validateJwt = expressJwt({
    secret: config.secret
  })

  /**
   * Attaches the user object to the request if authenticated
   * Otherwise returns 403
   */
  function isAuthenticated () {
    return compose()
      // Validate jwt
      .use(function (req, res, next) {
        // allow access_token to be passed through query parameter as well
        if (req.query && req.query.hasOwnProperty('access_token')) {
          req.headers.authorization = 'Bearer ' + req.query.access_token
        } else if (req.session && req.session.hasOwnProperty('access_token')) {
          // recovery token from session
          req.headers.authorization = 'Bearer ' + req.session.access_token
        }

        validateJwt(req, res, next)
      })
      // Attach user to request
      .use(function (req, res, next) {
        User.findById(req.user._id, function (err, user) {
          if (err) return next(err)
          if (!user) return next(err)
          req.user = user
          next()
        })
      })
  }

  /**
   * Checks if the user role meets the minimum requirements of the route
   */
  function hasRole (roleRequired) {
    if (!roleRequired) throw new Error('Required role needs to be set')

    return compose()
      .use(isAuthenticated())
      .use(function meetsRequirements (req, res, next) {
        if (config.userRoles.indexOf(req.user.role) >= config.userRoles.indexOf(roleRequired)) {
          next()
        } else {
          res.sendStatus(403)
        }
      })
  }

  /**
   * Returns a jwt token signed by the app secret
   */
  function signToken (id, role) {
    log.debug('Create token for ' + id)
    return jwt.sign({
      _id: id,
      role: role
    }, config.secret, {
      expiresIn: config.tokenExpires
    })
  }
  /**
   * Returns a jwt token signed by the app secret
   */
  function verifyToken (token) {
    try {
      return jwt.verify(token, config.secret)
    } catch (e) {
      log.error('Fail at to try validate the token', e)
      throw e
    }
  }

  function setTokenJson (req, res) {
    if (!req.user) return res.json(404, {message: 'Something went wrong, please try again.'})
    var token = signToken(req.user._id, req.user.role)
    req.session.access_token = token
    res.json(JSON.stringify(token))
  }

  imports.auth.isAuthenticated = isAuthenticated
  imports.auth.hasRole = hasRole
  imports.auth.signToken = signToken
  imports.auth.setTokenJson = setTokenJson
  imports.auth.verifyToken = verifyToken
}
