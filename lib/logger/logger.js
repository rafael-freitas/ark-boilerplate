/**
 * Logger interface
 *
 * Exports:
 * 	{LoggerClass} log
 *
 *
    ```js
         // For example, npm logging levels are prioritized from 0 to 5 (highest to lowest):
         { error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5 }
    ```

 * Specification from https://tools.ietf.org/html/rfc5424
 *            Numerical         Severity
             Code

              0       Emergency: system is unusable
              1       Alert: action must be taken immediately
              2       Critical: critical conditions
              3       Error: error conditions
              4       Warning: warning conditions
              5       Notice: normal but significant condition
              6       Informational: informational messages
              7       Debug: debug-level messages

              Table 2. Syslog Message Severities

 *
 * @param  {Object}   imports Imported objects
 * @param  {Function} done    callback
 */
module.exports = function setup(imports, done) {

    var winston = require('winston'),
        cluster = require('cluster'),
        path = require('path'),
        moment = require('moment'),
        colors = require('colors/safe'),
        config = imports.config,
        logsConfig = config.logs;

    var loggerConfig = {
        levels: {
            error: 0,
            warn: 1,
            info: 2,
            verbose: 3,
            debug: 4,
            silly: 5,
            data: 6
        },
        colors: {
            error: 'red',
            debug: 'blue',
            warn: 'yellow',
            data: 'grey',
            info: 'green',
            verbose: 'cyan',
            silly: 'magenta'
        }
    };

    var worker_id = cluster.worker ? cluster.worker.id : "main";

    // set theme
    colors.setTheme(loggerConfig.colors);

    createLogDir();

    function createLogger(container) {
        container = container || "app";

        var timestamp = function() {
                return moment().format("YYYY-MM-DD H:mm:ss");
            },
            formatter = function(options) {
                // Return string will be passed to logger.
                return [
                    colors.gray(options.timestamp()),
                    colors.gray(["[Worker ", worker_id, "]"].join("")),
                    colors.cyan(["[", container, "]"].join("")),
                    colors[options.level].call(colors, options.level.toUpperCase()),
                    (undefined !== options.message ? options.message : ''),
                    (options.meta && Object.keys(options.meta).length ? '\n\t' + JSON.stringify(options.meta) : '')
                ].join(' ');
            };

        var transports = [];
        transports.push(new winston.transports.Console({
            timestamp: timestamp,
            formatter: formatter,
            colorize: true,
            level: "data"
                // name: level+'-console'
        }));
        var file_error = logsConfig.files['error'];
        var file_messages = logsConfig.files['log'];

        transports.push(new winston.transports.File({
            name: 'error',
            filename: path.join(logsConfig.dir, file_error),
            level: 'error',
            handleExceptions: false,
            humanReadableUnhandledException: false
        }));

        // transports.push(new winston.transports.File({
        //     name: 'info-file',
        //     filename: path.join(logsConfig.dir, file_messages),
        //     level: 'info'
        // }));

        transports.push(new winston.transports.File({
            name: 'file',
            label: container,
            filename: path.join(logsConfig.dir, file_messages),
            level: 'verbose'
        }));

        // for (var level in loggerConfig.levels) {
        //     console.log(container, 'LEVEL', level);
        //
        //     // continue;
        //
        //     if (logsConfig.hasOwnProperty('levels') && logsConfig.levels.hasOwnProperty(level)) {
        //         var output_type = logsConfig.levels[level];
        //
        //         if ('console' != output_type) {
        //
        //             if (typeof logsConfig.files[output_type] == 'undefined') {
        //                 continue;
        //             }
        //             var file = logsConfig.files[output_type];
        //
        //             transports.push(new winston.transports.File({
        //                 name: level+'-file',
        //                 filename: path.join(logsConfig.dir, file),
        //                 level: level
        //             }));
        //         }
        //     }
        // }




        var logger = new winston.Logger({
            exitOnError: false,
            transports: transports,
            levels: loggerConfig.levels,
            colors: loggerConfig.colors
        });
        // logger.on('error', function (err) { /* Do Something */ });
        logger.emitErrs = true;
        // logger.setLevels(winston.config.syslog.levels);
        logger.setLevels(loggerConfig.levels);
        logger.colors = colors;

        logger.exit = function(code) {
            logger.transports.file.on('flush', function() {
                console.log('Exiting...');
                process.exit(code);
            });
            // throw Error("Application exit");
        };
        return logger;
    }



    /*
        Exports interface
     */
    imports.log = createLogger();
    imports.log.create = createLogger;


    function createLogDir() {
        var fs = require('fs');
        var dir = logsConfig.dir;

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
    }

    done();
};
