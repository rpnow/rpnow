const bodyParser = require('body-parser');
const cors = require('cors');
const { Router } = require('express');

const model = require('../model');
const config = require('../config');
const { generateChallenge } = require('../services/challenge');

const router = Router();
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));
if (config.get('allowCORS')) router.use(cors());

router.post('/rp.json', (req, res, next) => {
    const roomOptions = req.body;
    model.createRp(roomOptions)
        .then(data => res.status(201).json(data))
        .catch(err => next(err));
});

router.get('/challenge.json', (req, res, next) => {
    generateChallenge()
        .then(data => res.status(200).json(data))
        .catch(err => next(err));
});

router.get('/rp/:rpCode([0-9a-zA-Z]+)/page/:pageNum([1-9][0-9]{0,})', (req, res, next) => {
    model.getPage(req.params.rpCode, +req.params.pageNum)
        .then(data => res.status(200).json(data))
        .catch(err => next(err));
});

router.all('*', (req, res, next) => {
    next({ code: 'UNKNOWN_REQUEST' });
});

router.use((err, req, res, next) => {
    res.status(400).json({ error: err });
});

module.exports = router;
