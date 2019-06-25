const bodyParser = require('body-parser');
const cors = require('cors');
const { Router } = require('express');
// const { downloadDocx } = require('../services/download.docx');
const { txtFileStream } = require('../services/download.txt');
const { jsonFileStream } = require('../services/download.json');
const xRobotsTag = require('../services/x-robots-tag');
const logger = require('../services/logger');

const model = require('../model');
const config = require('../config');

const router = Router();
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));
if (config.get('cors')) router.use(cors());
router.use(xRobotsTag);

router.get('/rp/:rpCode([-0-9a-zA-Z]+)/download.txt', async (req, res, next) => {
    const { includeOOC = false } = req.query;

    let rp;
    try {
        (rp = await model.getRpWithMessageStream(req.params.rpCode));
    } catch (err) {
        return next(err);
    }

    const rpStream = txtFileStream(rp, { includeOOC });
    res.attachment(`${rp.title}.txt`).type('.txt');
    return rpStream.pipe(res);
});

router.get('/rp/:rpCode([-0-9a-zA-Z]+)/download.json', async (req, res, next) => {
    let rp;
    try {
        (rp = await model.getRpWithMessageStream(req.params.rpCode));
    } catch (err) {
        return next(err);
    }

    const rpStream = jsonFileStream(rp);
    res.attachment(`${rp.title}.json`).type('.json');
    return rpStream.pipe(res);
});

router.all('*', (req, res, next) => {
    next({ code: 'UNKNOWN_REQUEST' });
});

router.use((err, req, res, next) => {
    logger.debug(err);
    res.status(400).json({ error: err });
});

module.exports = router;
