const logger = require('./services/logger');
const config = require('./config');
const express = require('express');
const xRobotsTag = require('./services/x-robots-tag');
const { createServer } = require('http');

logger.debug('Starting RPNow API...');

const app = express();
const server = createServer(app);

if (config.get('trustProxy')) app.enable('trust proxy');

// rest api
app.use('/api', require('./api/api.rest'));

// websocket api
require('./api/api.sockets')(server);

// static file serving + SPA routes
const staticRoutes = new express.Router();
app.use(staticRoutes);
const clientFiles = __dirname.replace('server/src', 'client/dist/rpnow');
// set compression header if we're serving compressed files
if (config.get('bundleCompression') === 'gzip') {
    staticRoutes.use((req, res, next) => {
        if (!req.path.endsWith('.mp3')) {
            res.set('Content-Encoding', 'gzip');
        }
        next();
    });
}
// bundle
staticRoutes.use('/client-files', express.static(clientFiles));
// legacy redirects
staticRoutes.get('/about', (req, res) => res.redirect('/'));
staticRoutes.get('/format', (req, res) => res.redirect('/'));
staticRoutes.get('/sample', (req, res) => res.redirect('/rp/demo'));
staticRoutes.get('/rp/*/export', (req, res) => res.redirect('/'));
staticRoutes.get('/rp/:rpCode/stats', (req, res) => res.redirect(`/rp/${req.params.rpCode}`));
// valid routes
staticRoutes.get('/', (req, res) => res.sendFile(`${clientFiles}/index.html`));
staticRoutes.get('/terms', (req, res) => res.sendFile(`${clientFiles}/index.html`));
staticRoutes.get('/rp/demo', (req, res) => res.sendFile(`${clientFiles}/index.html`)); // separate, because no xRobotsTag
staticRoutes.get('/rp/*', xRobotsTag, (req, res) => res.sendFile(`${clientFiles}/index.html`));
// 404
staticRoutes.get('*', (req, res) => res.status(404).sendFile(`${clientFiles}/index.html`));

// listen
server.listen(config.get('port'), (err) => {
    if (err) logger.error(err);
    else logger.info('RPNow API: ready.');
});
