const express = require('express');
const logger = require('./services/logger');
const config = require('./services/config');
const restApi = require('./routes/rest-api');
const staticFiles = require('./routes/static-files');

logger.debug('Starting RPNow API...');

const app = express();
if (config.trustProxy) app.enable('trust proxy');

// express routers
app.use('/api', restApi);
app.use(staticFiles);

// listen
app.listen(config.port, (err) => {
    if (err) logger.error(err);
    else logger.info('RPNow API: ready.');
});
