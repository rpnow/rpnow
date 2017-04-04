const logger = require('./logger');
const config = require('./config');
const noop = (function(){});

logger.debug('Starting RPNow API...');

let app = require('express')();
let server = require('http').createServer(app);
app.use('/api', require('./api.rest'));
require('socket.io')(server, { serveClient: false })
    .on('connection', require('./api.sockets'));

let listener = server.listen(config.get('port'), (err) => {
    if (err) logger.error(err);
    else logger.info('RPNow API: ready.');
});

module.exports.stop = function stop(callback = noop) {
    if (!listener) {
        logger.warn('No server to stop.');
        return callback('No server to stop.');
    }

    listener.close((err) => { 
        if (err) {
            logger.error(err);
            return callback(err);
        }
        listener = null;
        logger.notice('RPNow API: Stopped successfully.');
        callback(null);
    });
};

process.on('SIGTERM', ()=> onKill('SIGTERM') ); //kill (terminate)
process.on('SIGINT', ()=> onKill('SIGINT') ); //Ctrl+C (interrupt)
function onKill(reason = 'No reason given') {
    logger.notice(`RPNow API: Attempting graceful shutdown: ${reason}`);
    stop();
}
