const express = require('express');
const path = require('path');
const { xRobotsTag } = require('../services/express-x-robots-tag-middleware');

// static file serving + SPA routes
const staticRoutes = new express.Router();
const clientFiles = path.join(__dirname, '../web');
// bundle
staticRoutes.use('/client-files/', express.static(clientFiles));
// valid routes
staticRoutes.get('/', (req, res) => res.sendFile(`${clientFiles}/home.html`));
staticRoutes.get('/terms', (req, res) => res.sendFile(`${clientFiles}/terms.txt`));
staticRoutes.get('/rp/demo', (req, res) => res.sendFile(`${clientFiles}/index.html`)); // separate, because no xRobotsTag
staticRoutes.get('/rp/[^/]+', xRobotsTag, (req, res) => res.sendFile(`${clientFiles}/rp.html`));
staticRoutes.get('/read/[^/]+/page/[0-9]+', (req, res) => res.sendFile(`${clientFiles}/rp-read.html`));
// 404
staticRoutes.get('*', (req, res) => res.status(404).sendFile(`${clientFiles}/404.html`));

module.exports = staticRoutes;
