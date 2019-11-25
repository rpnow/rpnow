const bodyParser = require('body-parser');
const cors = require('cors');
const { Router } = require('express');
// const { downloadDocx } = require('../services/download.docx');
const { txtFileStream } = require('../services/download.txt');
const { jsonFileStream } = require('../services/download.json');
const { getIpid } = require('../services/ipid');
const xRobotsTag = require('../services/x-robots-tag');
const logger = require('../services/logger');

const model = require('../model');
const config = require('../config');
const { generateChallenge } = require('../services/challenge');

const router = Router();
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));
if (config.get('cors')) router.use(cors());
router.use(xRobotsTag);

router.post('/rp.json', (req, res, next) => {
    const roomOptions = req.body;
    const ipid = getIpid(req.ip);

    model.createRp(roomOptions, ipid)
        .then(data => res.status(201).json(data))
        .catch(err => next(err));
});

router.post('/rp/:rpCode([-0-9a-zA-Z]+)/message', async (req, res, next) => {
    const { rpCode } = req.params;
    const input = req.body;
    const ipid = getIpid(req.ip);

    model.addMessage(rpCode, input, ipid)
        .then(data => res.status(200).json(data))
        .catch(err => next(err));
});

router.post('/rp/:rpCode([-0-9a-zA-Z]+)/image', async (req, res, next) => {
    const { rpCode } = req.params;
    const input = req.body;
    const ipid = getIpid(req.ip);

    model.addImage(rpCode, input, ipid)
        .then(data => res.status(200).json(data))
        .catch(err => next(err));
});

router.post('/rp/:rpCode([-0-9a-zA-Z]+)/chara', async (req, res, next) => {
    const { rpCode } = req.params;
    const input = req.body;
    const ipid = getIpid(req.ip);

    model.addChara(rpCode, input, ipid)
        .then(data => res.status(200).json(data))
        .catch(err => next(err));
});

router.patch('/rp/:rpCode([-0-9a-zA-Z]+)/message', async (req, res, next) => {
    const { rpCode } = req.params;
    const input = req.body;
    const ipid = getIpid(req.ip);

    model.editMessage(rpCode, input, ipid)
        .then(data => res.status(200).json(data))
        .catch(err => next(err));
});

router.patch('/rp/:rpCode([-0-9a-zA-Z]+)/chara', async (req, res, next) => {
    const { rpCode } = req.params;
    const input = req.body;
    const ipid = getIpid(req.ip);

    model.editChara(rpCode, input, ipid)
        .then(data => res.status(200).json(data))
        .catch(err => next(err));
});

router.get('/challenge.json', (req, res, next) => {
    generateChallenge()
        .then(data => res.status(200).json(data))
        .catch(err => next(err));
});

router.get('/rp/:rpCode([-0-9a-zA-Z]+)/page/:pageNum([1-9][0-9]{0,})', (req, res, next) => {
    model.getPage(req.params.rpCode, +req.params.pageNum)
        .then(data => res.status(200).json(data))
        .catch(err => next(err));
});

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

router.get('/rp/:rpCode([-0-9a-zA-Z]+)/download.docx', async (req, res, next) => {
    return res.sendStatus(501); // TODO fix implementation

    // const { includeOOC } = req.query;

    // let rp;
    // try {
    //     ({ rp } = await model.getWholeRp(req.params.rpCode));
    // } catch (err) {
    //     return next(err);
    // }

    // const body = downloadDocx(rp, { includeOOC });
    // return res.attachment(`${rp.title}.docx`).type('.docx').send(body);
});

router.all('*', (req, res, next) => {
    next({ code: 'UNKNOWN_REQUEST' });
});

router.use((err, req, res, next) => {
    logger.debug(err);
    res.status(400).json({ error: err });
});

module.exports = router;
