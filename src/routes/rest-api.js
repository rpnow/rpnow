const express = require('express');
const cors = require('cors');
const { Router } = require('express');
const { generateTextFile } = require('../services/download.txt');
const { getIpid } = require('../services/ipid');
const { xRobotsTag } = require('../services/x-robots-tag');
const logger = require('../services/logger');
const cuid = require('cuid');
const DB = require('../services/database');
const { validate } = require('../services/validate');
const { generateRpCode } = require('../services/rpcode.js');
const { generateChallenge, verifyChallenge } = require('../services/challenge');
const { publish, subscribe } = require('../services/event-bus');
const config = require('../services/config');
const { awrap } = require('../services/express-async-handler');

const router = Router();
router.use(express.json());
router.use(express.urlencoded({ extended: true }));
if (config.cors) router.use(cors());
router.use(xRobotsTag);

router.post('/rp.json', awrap(async (req, res, next) => {
    const rpCode = generateRpCode();
    const namespace = 'rp_' + cuid();
    const fields = req.body;
    await validate(namespace, 'meta', fields); // TODO or throw BAD_RP
    const ipid = getIpid(req.ip);

    await DB.addDoc(namespace, 'meta', 'meta', fields, ipid);
    await DB.addDoc('system', 'urls', rpCode, { rpNamespace: namespace }, ipid);

    res.status(201).json({ rpCode });
}));

router.get('/challenge.json', awrap(async (req, res, next) => {
    const challenge = await generateChallenge();
    res.status(200).json(challenge);
}));

const rpGroup = '/rp/:rpCode([-0-9a-zA-Z]{1,100})';

router.get(`${rpGroup}`, awrap(async (req, res, next) => {
    const { rpNamespace } = await DB.getDoc('system', 'urls', req.params.rpCode);

    const lastEventId = await DB.lastEventId();
    const { title, desc } = await DB.getDoc(rpNamespace, 'meta', 'meta', { snapshot: lastEventId });
    const msgs = await DB.getDocs(rpNamespace, 'msgs', { reverse: true, limit: 60, snapshot: lastEventId }).asArray();
    msgs.reverse();
    const charas = await DB.getDocs(rpNamespace, 'charas', { snapshot: lastEventId }).asArray();

    res.status(200).json({ title, desc, msgs, charas, lastEventId })
}));

router.get(`${rpGroup}/stream`, awrap(async (req, res, next) => {
    const { rpNamespace } = await DB.getDoc('system', 'urls', req.params.rpCode);

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

    const send = ({ eventId, collection, doc }) => {
        res.write(`id: ${eventId}\ndata: ${JSON.stringify({ type: collection, data: doc })}\n\n`);
    };

    // TODO get updates since ?lastMessageId=x, and send init message

    const unsub = subscribe(rpNamespace, send);

    // Stop streaming upon closing the connection
    req.once('close', () => {
        unsub();
        clearInterval(keepAliveTimer);
        res.end();
    });
}));

router.get(`${rpGroup}/page/:pageNum([1-9][0-9]{0,})`, awrap(async (req, res, next) => {
    const { rpNamespace } = await DB.getDoc('system', 'urls', req.params.rpCode);

    const skip = (req.params.pageNum - 1) * 20;
    const limit = 20;

    const { title, desc } = await DB.getDoc(rpNamespace, 'meta', 'meta');
    const msgs = await DB.getDocs(rpNamespace, 'msgs', { skip, limit }).asArray();
    const charas = await DB.getDocs(rpNamespace, 'charas').asArray();

    const msgCount = await DB.getDocs(rpNamespace, 'msgs').count();
    const pageCount = Math.ceil(msgCount / 20);

    res.status(200).json({ title, desc, msgs, charas, pageCount })
}));

router.get(`${rpGroup}/download.txt`, awrap(async (req, res, next) => {
    const { rpNamespace } = await DB.getDoc('system', 'urls', req.params.rpCode);

    const { title, desc } = await DB.getDoc(rpNamespace, 'meta', 'meta');
    // TODO getting all msgs at once is potentially problematic for huge RP's; consider using streams if possible
    const msgs = await DB.getDocs(rpNamespace, 'msgs').asArray(); 
    const charas = await DB.getDocs(rpNamespace, 'charas').asMap();
    const { includeOOC = false } = req.query;

    res.attachment(`${title}.txt`).type('.txt');
    generateTextFile({ title, desc, msgs, charas, includeOOC }, str => res.write(str));
    res.end();
}));

router.post(`${rpGroup}/:collection([a-z]+)`, awrap(async (req, res, next) => {
    const { rpNamespace } = await DB.getDoc('system', 'urls', req.params.rpCode);
    const collection = req.params.collection;
    const _id = cuid();
    const fields = req.body;
    await validate(rpNamespace, collection, fields); // TODO or throw BAD_RP
    const ipid = getIpid(req.ip);

    const { eventId, doc } = await DB.addDoc(rpNamespace, collection, _id, fields, ipid);

    publish(rpNamespace, { eventId, collection, doc });

    res.status(201).json({ _id });
}));

router.put(`${rpGroup}/:collection([a-z]+)/:doc_id([a-z0-9]+)`, awrap(async (req, res, next) => {
    const { rpNamespace } = await DB.getDoc('system', 'urls', req.params.rpCode);
    const collection = req.params.collection;
    const _id = req.params.doc_id;
    const fields = req.body;
    await validate(rpNamespace, collection, fields); // TODO or throw BAD_RP
    const ipid = getIpid(req.ip);

    const { eventId, doc } = await DB.updateDoc(rpNamespace, collection, _id, fields, ipid);

    // TODO verify auth
    // TODO secrets were 64 chars long, challenges were 128
    // if (!verifyChallenge(editInfo.secret, msg.challenge)) throw { code: 'BAD_SECRET' };

    publish(rpNamespace, { eventId, collection, doc });

    res.sendStatus(204);
}));

router.all('*', (req, res, next) => {
    next({ code: 'UNKNOWN_REQUEST' });
});

router.use((err, req, res, next) => {
    logger.info(err);
    res.status(500).json({ error: err.toString() });
});

module.exports = router;
