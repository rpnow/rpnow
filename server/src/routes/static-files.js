const express = require('express');
const xRobotsTag = require('../services/x-robots-tag');

// static file serving + SPA routes
const staticRoutes = new express.Router();
const clientFiles = __dirname.replace('server/src/routes', 'client/dist/rpnow');
// bundle
staticRoutes.use('/client-files/', express.static(clientFiles));
// valid routes
staticRoutes.get('/', (req, res) => res.sendFile(`${clientFiles}/index.html`));
staticRoutes.get('/terms', (req, res) => res.sendFile(`${clientFiles}/index.html`));
staticRoutes.get('/rp/demo', (req, res) => res.sendFile(`${clientFiles}/index.html`)); // separate, because no xRobotsTag
staticRoutes.get('/rp/*', xRobotsTag, (req, res) => res.sendFile(`${clientFiles}/index.html`));
// 404
staticRoutes.get('*', (req, res) => res.status(404).sendFile(`${clientFiles}/index.html`));

module.exports = staticRoutes;
