var fs = require('fs'),
    path = require('path');

module.exports = function setup(imports) {

    var config = imports.config;

    imports.util.path = {

        getDirectories: getDirectories,
        getFiles: getFiles,
        /**
         * Return a list of subdirectories from the root dir
         *
         * @param  {String} srcpath path
         * @return {Array}
         *
         * @example
         * ```js
         * var path = imports.utils.path;
         * var arrDirs = path.listSubdirs("./models");
         * console.log( arrDirs[0] ) // => /path/to/root_app_dir/models/my_model_dir
         * ```
         */
        listSubdirs: function listSubdirs(srcpath) {
            return getDirectories( path.join(config.root, srcpath) );
        },
        /**
         * Return a list of subdirectories from the root dir
         *
         * @param  {String} srcpath path
         * @return {Array}
         *
         * @example
         * ```js
         * var path = imports.utils.path;
         * var arrDirs = path.listSubdirs("./models");
         * console.log( arrDirs[0] ) // => /path/to/root_app_dir/models/my_model_dir
         * ```
         */
        listFiles: function listFiles(srcpath) {
            return getFiles( path.join(config.root, srcpath) );
        }
    };

    /**
     * Return a list of subdirectories from a absolute path
     * @param  {string} srcpath path
     * @return {Array}         List of dirs
     */
    function getDirectories(srcpath) {
        return fs.readdirSync(srcpath).filter(function(file) {
            return fs.statSync(path.join(srcpath, file)).isDirectory();
        });
    }

    function getFiles(srcpath) {
        return fs.readdirSync(srcpath).filter(function(file) {
            return ! fs.statSync(path.join(srcpath, file)).isDirectory();
        });
    }
};
