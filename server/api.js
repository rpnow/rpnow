const winston = require('winston');
const rpnow = require('./constants');

const noop = (function(){});

let app = require('express')();
let server = require('http').createServer(app);
app.use('/api/', require('./api.rest'));
require('socket.io')(server, { serveClient: false })
    .on('connection', require('./api.sockets'));

let listener = server.listen(rpnow.port);

module.exports.stop = function stop(callback = noop) {
    if (!listener) return callback('No server to stop.');

    listener.close((err) => { 
        if (err) return callback(err);
        listener = null;
        callback(null);
    });
};

process.on('SIGTERM', ()=> onKill('SIGTERM') ); //kill (terminate)
process.on('SIGINT', ()=> onKill('SIGINT') ); //Ctrl+C (interrupt)
function onKill(reason = 'No reason given') {
    console.log(`RPNow API: Attempting graceful shutdown: ${reason}`);
    stop((err)=> {
        if (err) console.error(err);
        else console.log('RPNow API: Shutdown complete.');
    });
}
