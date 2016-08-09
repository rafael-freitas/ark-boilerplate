module.exports = function setup (imports, done) {
  /*
    requires / imports
    ----------------------------------------------------------------------------
   */
  var mongoose = require('mongoose')
  var config = imports.config
  // var util = imports.util
  var log = imports.log

  /*
    script body
    ----------------------------------------------------------------------------
   */
  // log.info('Loading models from ' + log.colors.yellow('/models'))
  //
  // var subdirs = util.path.listSubdirs('models')
  //
  // log.debug('Models LOADEDS from ' + log.colors.yellow('/models'))

  mongoose.connect(config.db)
  mongoose.connection.on('open', open_handler_callback)
  mongoose.connection.on('error', error_handler_callback)

  function open_handler_callback () {
    log.info('Database connected')
  }

  function error_handler_callback (err) {
    log.error('Unable to connect to database', err)
  }

  // exports
  imports.models = {}

  done()
}
