module.exports = function setup (imports) {
  var config = imports.config
  var path = imports.util.path
  var app = this

  /**
   * Import a file calling with [imports] param
   * @example
   * imports.util.import("./myfile") // => is the same that: require("./myfile")(imports)
   *
   * @param  {String} filepath
   * @return {Mixed}
   */
  imports.util.import = function importFile (filepath) {
    return require(filepath).call(app, imports)
  }

  /**
   * Import all files from a directory
   * @example
   *
   * var arrResultList = imports.util.import.dir(__dirname + "/myDir")
   * console.log(arrResultList.length, "was imported")
   *
   * @param  {String} dirpath
   * @return {Array}
   */
  imports.util.import.dir = function importAllFilesDir (dirpath) {
    var results = []
    var files = path.getFiles(dirpath)

    for (file of files) {
      var result = require(require('path').join(dirpath, file))
      if (typeof result == 'function') {
        results.push(result.call(app, imports))
      }
    }
    return results
  }
}
