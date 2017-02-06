const express = require('express');
const router = express.Router();
module.exports = router;

router.get('/', (req, res) => res.sendFile(`${__dirname}/html/home.html`));
router.get('/rp/:url', (req, res) => res.sendFile(`${__dirname}/html/rp.html`));
router.get('*', (req, res) => res.status(404).sendFile(`${__dirname}/html/404.html`));