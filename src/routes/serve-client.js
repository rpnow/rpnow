const express = require('express');
const expressVue = require('express-vue');
const path = require('path');
const { xRobotsTag } = require('../services/express-x-robots-tag-middleware');
const vueHead = require('../views/head');

const router = new express.Router();

// bundle
const clientFiles = path.join(__dirname, '../static');
router.use('/static/', express.static(clientFiles));

// .vue file rendering
const viewFiles = path.join(__dirname, '../views');
router.use(expressVue.init({ rootPath: viewFiles, head: vueHead }));

// valid routes
router.get('/', (req, res) => res.renderVue('home.vue', null, { head: { title: 'RPNow' } }));
router.get('/terms', (req, res) => res.sendFile(`${viewFiles}/terms.txt`));
router.get('/format', (req, res) => res.renderVue('format.vue', null, { head: { title: 'Format Guide | RPNow' } }));
router.get('/rp/[\\w-]+', xRobotsTag, (req, res) => res.renderVue('rp.vue', null, { head: { title: 'Loading RP | RPNow' } }));
router.get('/read/[\\w-]+/page/[0-9]+', xRobotsTag, (req, res) => res.renderVue('rp-read.vue', null, { head: { title: 'Loading RP | RPNow' } }));

// 404
router.get('*', (req, res) => res.renderVue('404.vue', null, { head: { title: 'Page Not Found' } }));

module.exports = router;
