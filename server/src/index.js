const http = require('http');
const express = require('express');
const logger = require('./services/logger');
const config = require('./config');
const restApi = require('./routes/rest-api');
const staticFiles = require('./routes/static-files');
const createSocketListener = require('./routes/sockets');

logger.debug('Starting RPNow API...');

const httpServer = http.createServer();

const app = express();
if (config.get('trustProxy')) app.enable('trust proxy');
httpServer.on('request', app);

// express routers
app.use('/api', restApi);
app.use(staticFiles);

// websocket api
createSocketListener(httpServer);

// listen
httpServer.listen(config.get('port'), (err) => {
    if (err) logger.error(err);
    else logger.info('RPNow API: ready.');
});
