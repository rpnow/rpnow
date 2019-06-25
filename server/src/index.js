const http = require('http');
const express = require('express');
const logger = require('./services/logger');
const config = require('./config');
const restApi = require('./routes/rest-api');
const staticFiles = require('./routes/static-files');
const dao = require('./dao/dao.mongo');

logger.debug('Starting RPNow API...');

const httpServer = http.createServer();

const app = express();
if (config.get('trustProxy')) app.enable('trust proxy');
httpServer.on('request', app);

// express routers
app.use('/api', restApi);
app.use(staticFiles);

// websocket api
// createWss(httpServer);

// listen
httpServer.listen(config.get('port'), (err) => {
    if (err) logger.error(err);
    else logger.info('RPNow API: ready.');
});

// graceful shutdown
process.on('SIGTERM', async () => {
    logger.notice('Received SIGTERM');

    // logger.info('Closing WS server');
    // await closeWss();

    logger.info('Closing HTTP server');
    await new Promise(resolve => httpServer.close(resolve));

    logger.info('Closing DB connection');
    await dao.close();

    // logger.info('Closing event bus connection');
    // await events.close();

    logger.info('Exiting');
    process.exit(0);
});
