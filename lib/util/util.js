module.exports = function setup (imports, done) {
  imports.util = {}

  require('./path').call(this, imports)
  require('./import').call(this, imports)

  done()
}
