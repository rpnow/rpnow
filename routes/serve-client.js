const express = require('express');
const path = require('path');

const router = new express.Router();
const clientFiles = path.join(__dirname, '../dist');

// bundle
router.use('/', express.static(clientFiles));

// valid routes
const indexHTML = (req, res) => res.sendFile(`${clientFiles}/index.html`);
router.get('/', indexHTML);
router.get('/login', indexHTML);
router.get('/register', indexHTML);
router.get('/import', indexHTML);
router.get('/format', indexHTML);
router.get('/rp/:rpCode', indexHTML);
router.get('/read/:rpCode', indexHTML);
router.get('/read/:rpCode/page/:page', indexHTML);

module.exports = router;
