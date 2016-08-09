var ark = require("node-app-ark");
var cluster = require('cluster');

process.env.ARK_BASE_PATH = __dirname;


if (process.execArgv.join('').indexOf('--debug') != -1) {
    ark.create( [
        "packages/main"
    ], function () {
        console.log('Application started on (' + ('debug') + ')');
    })
    return;
}

if ((cluster.isMaster) &&
  (process.execArgv.indexOf('--debug') < 0) &&
  (process.env.NODE_ENV!=='test') && (process.env.NODE_ENV!=='development') &&
  (process.execArgv.indexOf('--singleProcess')<0)) {


    console.log('for real!');
    // Count the machine's CPUs
    var cpuCount = process.env.CPU_COUNT || require('os').cpus().length;

    // Create a worker for each CPU
    for (var i = 0; i < cpuCount; i += 1) {
        console.log ('forking ',i);
        cluster.fork();
    }

    // Listen for dying workers
    cluster.on('exit', function (worker) {
        // Replace the dead worker, we're not sentimental
        console.log('Worker ' + worker.id + ' died :(');
        cluster.fork();

    });

// Code to run if we're in a worker process
} else {

    var workerId = 0;
    if (!cluster.isMaster)
    {
        workerId = cluster.worker.id;
    }
    ark.create( [
        "packages/main"
    ], function () {
        console.log('Application started on (' + (process.env.NODE_ENV || 'development') + ') cluster.worker.id:', workerId);
    })
}
