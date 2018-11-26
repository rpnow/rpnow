const bodyParser = require('body-parser');
const cors = require('cors');
const { Router } = require('express');
const { txtFileStream } = require('../services/download.txt');
const { getIpid } = require('../services/ipid');
const xRobotsTag = require('../services/x-robots-tag');
const logger = require('../services/logger');
const cuid = require('cuid');
const { Docs } = require('../dao/dao.sqlite');
const validate = require('../services/validate');
const { generateRpCode } = require('../services/rpcode.js');
const { verifyChallenge } = require('../services/challenge');
const errors = require('../errors');
const { publish, subscribe } = require('../events');

const config = require('../config');
const { generateChallenge } = require('../services/challenge');

const router = Router();
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));
if (config.get('cors')) router.use(cors());
router.use(xRobotsTag);

router.post('/rp.json', async (req, res, next) => {
    const rpCode = generateRpCode();
    const namespace = 'rp_' + cuid();
    const fields = await validate('meta', req.body); // TODO or throw BAD_RP
    const ipid = getIpid(req.ip);

    await Docs.create(namespace, 'meta', 'meta', fields, ipid);
    await Docs.create('system', 'urls', rpCode, { rpNamespace: namespace }, ipid);

    res.status(201).json({ rpCode });
});

router.get('/challenge.json', async (req, res, next) => {
    const challenge = await generateChallenge();
    res.status(200).json(challenge);
});

const rpGroup = '/rp/:rpCode([-0-9a-zA-Z]{1,100})';

router.get(`${rpGroup}`, async (req, res, next) => {
    // TODO transaction start
    const { rpNamespace } = await Docs.doc('system', 'urls', req.params.rpCode);

    const { title, desc } = await Docs.doc(rpNamespace, 'meta', 'meta');
    const msgs = await Docs.docs(rpNamespace, 'msgs', { reverse: true, limit: 60 }).asArray();
    msgs.reverse();
    const charas = await Docs.docs(rpNamespace, 'charas', {}).asArray();
    const lastEventId = await Docs.lastEventId();
    // TODO transaction end

    res.status(200).json({ title, desc, msgs, charas, lastEventId })
});

router.get(`${rpGroup}/updates`, async (req, res, next) => {
    const { rpNamespace } = await Docs.doc('system', 'urls', req.params.rpCode);

    // Server-sent event headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });

    // Server-sent event keep alive
    res.write(':\n\n');
    let keepAliveTimer = setInterval(() => {
        res.write(':\n\n');
    }, 10000);

    const send = (json) => {
        const { id, data } = json;
        res.write(`id: ${id}\ndata: ${JSON.stringify(data)}\n\n`);
    };
    
    // TODO get updates since ?lastMessageId=x, and send init message

    const unsub = subscribe(rpNamespace, send);

    // Stop streaming upon closing the connection
    req.once('close', () => {
        unsub();
        clearInterval(keepAliveTimer);
        res.end();
    });
});

router.get(`${rpGroup}/page/:pageNum([1-9][0-9]{0,})`, async (req, res, next) => {
    const { rpNamespace } = await Docs.doc('system', 'urls', req.params.rpCode);

    const skip = (req.params.pageNum - 1) * 20;
    const limit = 20;

    const { title, desc } = await Docs.doc(rpNamespace, 'meta', 'meta');
    const msgs = await Docs.docs(rpNamespace, 'msgs', { skip, limit }).asArray();
    const charas = await Docs.docs(rpNamespace, 'charas', {}).asArray();

    const msgCount = await Docs.docs(rpNamespace, 'msgs', {}).count();
    const pageCount = Math.ceil(msgCount / 20);

    res.status(200).json({ title, desc, msgs, charas, pageCount })
});

router.get(`${rpGroup}/download.txt`, async (req, res, next) => {
    const { rpNamespace } = await Docs.doc('system', 'urls', req.params.rpCode);

    const { title, desc } = await Docs.doc(rpNamespace, 'meta', 'meta');
    const msgStream = await Docs.docs(rpNamespace, 'msgs', {}).asStream();
    const charas = await Docs.docs(rpNamespace, 'charas', {}).asMap();
    const { includeOOC = false } = req.query;

    // TODO I don't like this
    const rp = { title, desc, msgStream, charas };

    const rpStream = txtFileStream(rp, { includeOOC });
    res.attachment(`${rp.title}.txt`).type('.txt');
    // TODO do we need to 'return'
    return rpStream.pipe(res);
});

router.post(`${rpGroup}/:collection([a-z]+)`, async (req, res, next) => {
    const { rpNamespace } = await Docs.doc('system', 'urls', req.params.rpCode);
    const collection = req.params.collection;
    const _id = cuid();
    const fields = await validate(collection, req.body); // TODO or throw BAD_RP
    const ipid = getIpid(req.ip);

    const doc = await Docs.create(rpNamespace, collection, _id, fields, ipid);

    // TODO publish
    // publish(rpCode, { type: 'append', data: { [collection]: [doc] } });

    res.status(201).json({ _id });
});

router.put(`${rpGroup}/:collection([a-z]+)/:doc_id([a-z0-9]+)`, async (req, res, next) => {
    const { rpNamespace } = await Docs.doc('system', 'urls', req.params.rpCode);
    const collection = req.params.collection;
    const _id = req.params.doc_id;
    const fields = await validate(collection, req.body); // TODO or throw BAD_RP
    const ipid = getIpid(req.ip);

    const doc = await Docs.update(rpNamespace, collection, _id, fields, ipid);

    // TODO verify auth
    // if (!verifyChallenge(editInfo.secret, msg.challenge)) throw { code: 'BAD_SECRET' };

    // TODO publish
    // publish(rpCode, { type: 'put', data: { [collection]: [doc] } });

    res.sendStatus(204);
});

router.all('*', (req, res, next) => {
    next({ code: 'UNKNOWN_REQUEST' });
});

router.use((err, req, res, next) => {
    logger.debug(err);
    res.status(400).json({ error: err });
});

module.exports = router;
