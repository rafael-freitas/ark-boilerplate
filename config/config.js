var merge = require('merge')

module.exports = function setup (imports, done) {
  var env_name = process.env.NODE_ENV || 'development'
  /*
      load the config set on environment NODE_ENV
      /config/env/development.js
      /config/env/production.js
      /config/env/tests.js
   */
  var config_all_file = require('path').resolve(__dirname, 'env/', 'all')
  var config_file = require('path').resolve(__dirname, 'env/', env_name)
  var config_all = require(config_all_file)

  // merge env/all.js and env/development.js
  var config = merge.recursive(config_all, require(config_file))

  imports.config = config
  imports.middlewares = {}
  done()
}
