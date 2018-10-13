const express = require('express');
const config = require('../config');
const xRobotsTag = require('../services/x-robots-tag');

// static file serving + SPA routes
const staticRoutes = new express.Router();
const clientFiles = __dirname.replace('server/src/routes', 'client/dist/rpnow');
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
// service worker
staticRoutes.get('/ngsw-worker.js', (req, res) => res.sendFile(`${clientFiles}/ngsw-worker.js`));
staticRoutes.get('/safety-worker.js', (req, res) => res.sendFile(`${clientFiles}/safety-worker.js`));
staticRoutes.get('/worker-basic.min.js', (req, res) => res.sendFile(`${clientFiles}/worker-basic.min.js`));
staticRoutes.get('/ngsw.json', (req, res) => res.sendFile(`${clientFiles}/ngsw.json`));
// 404
staticRoutes.get('*', (req, res) => res.status(404).sendFile(`${clientFiles}/index.html`));

module.exports = staticRoutes;
