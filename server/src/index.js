const logger = require('./services/logger');
const config = require('./config');
const express = require('express');
const { createServer } = require('http');

logger.debug('Starting RPNow API...');

const app = express();
const server = createServer(app);

// rest api
app.use('/api', require('./api/api.rest'));

// websocket api
require('./api/api.sockets')(server);

// static file serving + SPA routes
const staticDir = __dirname.replace('server/src', 'client/dist');
app.use(express.static(staticDir));
app.get('/terms', (req, res) => res.sendFile(`${staticDir}/index.html`));
app.get('/rp/*', (req, res) => res.sendFile(`${staticDir}/index.html`));

// listen
server.listen(config.get('port'), (err) => {
    if (err) logger.error(err);
    else logger.info('RPNow API: ready.');
});
