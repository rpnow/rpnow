var express = require('express');
var router = express.Router();

router.get('/', (req, res) => res.sendFile(`${__dirname}/html/home.html`));

// router.get('/rp/:url', (req, res) => TODO);

module.exports = router;