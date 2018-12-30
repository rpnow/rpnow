const express = require('express');
const expressVue = require('express-vue');
const path = require('path');
const { xRobotsTag } = require('../services/express-x-robots-tag-middleware');

const router = new express.Router();

// bundle
const clientFiles = path.join(__dirname, '../web');
router.use('/client-files/', express.static(clientFiles));

// .vue file rendering
const viewFiles = path.join(__dirname, '../views');
router.use(expressVue.init({
    rootPath: viewFiles,
    head: {
        metas: [
            { charset:'utf-8' },
            { name:"viewport", content:"width=device-width, initial-scale=1, maximum-scale=1" },

            { name:"apple-mobile-web-app-capable", content:"yes" },
            { name:"apple-mobile-web-app-status-bar-style", content:"default" },
            { name:"theme-color", content:"#fafafa" },

            { rel: "icon", type: "image/png", href: "/client-files/assets/favicon/favicon-16x16.png", sizes: "16x16" },
            { rel:"icon", type:"image/png", href:"/client-files/assets/favicon/favicon-32x32.png", sizes:"32x32" },
            { rel:"icon", type:"image/png", href:"/client-files/assets/favicon/favicon-96x96.png", sizes:"96x96" },
            { rel:"apple-touch-icon", href:"/client-files/assets/favicon/favicon-128x128.png" },
            { rel:"stylesheet", href:"https://fonts.googleapis.com/css?family=Alice|Playfair+Display" },
            { rel:"stylesheet", href:"https://fonts.googleapis.com/icon?family=Material+Icons" },
            { rel:"manifest", href:"/client-files/manifest.json" },
        ],
        scripts: [
            // Promise polyfill for older browsers, needed for axios
            { src: "https://cdn.jsdelivr.net/npm/es6-promise@4.2.5/dist/es6-promise.auto.min.js" },
            // Axios, our http library
            { src: "https://cdn.jsdelivr.net/npm/axios@0.18.0/dist/axios.min.js" },
            // coolstory.js, which gives us fun random titles for stories
            { src: "https://cdn.jsdelivr.net/npm/coolstory.js@0.1.2/coolstory.js" },
        ]
    }
}));

// valid routes
router.get('/', (req, res) => res.renderVue('home.vue', null, { head: { title: 'RPNow' } }));
router.get('/terms', (req, res) => res.sendFile(`${viewFiles}/terms.txt`));
router.get('/format', (req, res) => res.renderVue('format.vue', null, { head: { title: 'Format Guide | RPNow' } }));
router.get('/rp/[^/]+', xRobotsTag, (req, res) => res.sendFile(`${clientFiles}/rp.html`));
router.get('/read/[^/]+/page/[0-9]+', (req, res) => res.sendFile(`${clientFiles}/rp-read.html`));

// 404
router.get('*', (req, res) => res.renderVue('404.vue', null, { head: { title: 'Page Not Found' } }));

module.exports = router;
