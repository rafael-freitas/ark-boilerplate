/* globals require */
'use strict'

/**
 * Module dependencies.
 */
var compression = require('compression'),
  consolidate = require('consolidate'),
  // swig = require('swig'),
  express = require('express'),
  session = require('express-session'),
  MongoStore = require('connect-mongo')(session),
  // helpers = require('view-helpers'),
  // flash = require('connect-flash'),
  modRewrite = require('connect-modrewrite'),
  bodyParser = require('body-parser'),
  cookieParser = require('cookie-parser')

module.exports = function (imports, done) {
  var config = imports.config
  var middlewares = imports.middlewares
  var app = imports.app

  if (config.bodyParser !== undefined) {
    app.use(bodyParser.json(config.bodyParser.json))
    app.use(bodyParser.urlencoded(config.bodyParser.urlencoded))
  }

  app.set('showStackError', true)

  // read cookies (needed for auth)
  app.use(cookieParser())

  // Get session_id from querystring and manually create session cookie.
  // So express.session can pick up the session for clients that do not allow session cookies
  // eg usage: http://localhost:3000/?session_id=asdfjkasdfasdf
  // app.use(function getSessionByQuerystring(req, res, next) {
  //
  //     // setting req.headers.cookie will result in an error when express.session tries to grab the session
  //     if (req.query.session_id) req.headers.cookie = ["connect.sid=" + req.query.session_id]
  //
  //
  //     // setting req.cookies instead does not throw an error
  //     // this works great in express 3.4, and express.session will correctly grab the session
  //     // however this does not work in express 3.20 - express.session does not seem to recognize the cookie, so the session is lost
  //     // before uncommenting this for testing be sure to comment out the above if statement that sets req.headers.cookie
  //     // if ( req.query.session_id ) req.cookies[ "connect.sid" ] = req.query.session_id
  //
  //     next()
  // })

  // var MemoryStore = session.MemoryStore

  // app.set('trust proxy', 1) // trust first proxy

  // exports express-session middleware for use on socket.io server
  middlewares.session = session({
    name: 'session.id',
    secret: config.sessionSecret,
    resave: true,
    saveUninitialized: true,
    // cookie: {
    //     secure: true
    // },
    // store: new MemoryStore()

    // using mongo to save session data
    store: new MongoStore({
      url: config.db,
      collection: config.sessionCollection,
      autoReconnect: true
    })
  })
  app.use(middlewares.session)

  // Prettify HTML
  app.locals.pretty = true

  // cache=memory or swig dies in NODE_ENV=production

  if (process.env.NODE_ENV === 'production') {
    app.locals.cache = 'memory'
  }

  // Should be placed before express.static
  // To ensure that all assets and data are compressed (utilize bandwidth)
  app.use(compression({
    // Levels are specified in a range of 0 to 9, where-as 0 is
    // no compression and 9 is best compression, but slowest
    level: 9
  }))

  app.use(express.static(config.root + '/public'))

  // app.set('view cache', false)
  // swig.setDefaults({ cache: false })

  // Enable compression on bower_components
  app.use('/bower_components', express.static(config.root + '/bower_components'))

  // app.use('/bundle', express.static(config.root + '/bundle'))

  // Adds logging based on logging config in config/env/ entry
  // require('./middlewares/logging')(app, config.logging)

  // assign the template engine to .html files
  app.engine('html', consolidate[config.templateEngine])

  // set .html as the default extension
  app.set('view engine', 'html')

  // Dynamic helpers
  // app.use(helpers(config.app.name))

  // Connect flash for flash messages
  // app.use(flash())

  app.use(modRewrite([

    '!^/api/.*|^/admin/.*|\\.html|\\.js|\\.css|\\.swf|\\.jp(e?)g|\\.png|\\.ico|\\.gif|\\.svg|\\.eot|\\.ttf|\\.woff|\\.txt|\\.pdf$ / [L]'

  ]))

  done()

// app.use(seo())
}
