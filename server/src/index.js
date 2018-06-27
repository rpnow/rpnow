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
const staticRoutes = new express.Router();
const staticDir = __dirname.replace('server/src', 'client/dist/rpnow');
staticRoutes.use(express.static(staticDir));
staticRoutes.get('/terms', (req, res) => res.sendFile(`${staticDir}/index.html`));
staticRoutes.get('/rp/*', (req, res) => res.sendFile(`${staticDir}/index.html`));
app.use(staticRoutes);

// listen
server.listen(config.get('port'), (err) => {
    if (err) logger.error(err);
    else logger.info('RPNow API: ready.');
});
