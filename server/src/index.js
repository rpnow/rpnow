const logger = require('./services/logger');
const config = require('./config');
const express = require('express');

logger.debug('Starting RPNow API...');

const app = express();
const server = require('http').createServer(app);
app.use('/api', require('./api/api.rest'));

require('./api/api.sockets')(server);

server.listen(config.get('port'), (err) => {
    if (err) logger.error(err);
    else logger.info('RPNow API: ready.');
});
