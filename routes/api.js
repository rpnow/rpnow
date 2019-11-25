const express = require('express');
const { Router } = require('express');
const Busboy = require('busboy');
const debug = require('debug')('rpnow');
const { generateTextFile } = require('../services/txt-file');
const { exportRp, importRp } = require('../services/json-file');
const { xRobotsTag } = require('../services/express-x-robots-tag-middleware');
const cuid = require('cuid');
const DB = require('../services/database');
const { validate } = require('../services/validate-user-documents');
const { generateRpCode } = require('../services/generate-rp-code');
const { generateAnonCredentials, authMiddleware } = require('../services/anon-credentials');
const { awrap } = require('../services/express-async-handler');

const router = Router();
router.use(express.json({ limit: '100mb' }));
router.use(xRobotsTag);

/**
 * Health check to see if the server is alive and responding
 */
router.get('/health', (req, res, next) => {
    res.status(200).json({rpnow:'ok'})
})

/**
 * Create a new RP
 */
router.post('/rp', authMiddleware, awrap(async (req, res, next) => {
    const rpNamespace = 'rp_' + cuid();
    const fields = req.body;
    const { userid } = req.user;
    const ip = req.ip;

    await validate(rpNamespace, 'meta', fields); // TODO or throw BAD_RP

    const rpCode = generateRpCode(5);
    const readCode = fields.title.replace(/\W/ig, '-').toLowerCase() + '-' + generateRpCode(3);

    await DB.addDoc(rpNamespace, 'meta', 'meta', fields, { userid, ip });
    await DB.addDoc(rpNamespace, 'readCode', 'readCode', { readCode }, { userid, ip });
    await DB.addDoc('system', 'urls', rpCode, { rpNamespace, access: 'normal' }, { userid, ip });
    await DB.addDoc('system', 'urls', readCode, { rpNamespace, access: 'read' }, { userid, ip });

    res.status(201).json({ rpCode });
}));

/**
 * Import RP from JSON
 */
const importStatus = new Map();

router.post('/rp/import', authMiddleware, awrap(async (req, res, next) => {
    const rpNamespace = 'rp_' + cuid();
    const { userid } = req.user;
    const ip = req.ip;

    const busboy = new Busboy({ headers: req.headers });

    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
        if (fieldname !== 'file') return file.resume();

        const rpCode = generateRpCode(5);

        file.on('end', () => {
            importStatus.set(rpCode, { status: 'pending' });
            res.status(202).json({ rpCode });
        });

        importRp(rpNamespace, userid, ip, file, async (err) => {
            if (err) return importStatus.set(rpCode, { status: 'error', error: err.toString() });

            const { title } = await DB.getDoc(rpNamespace, 'meta', 'meta');

            const readCode = title.replace(/\W/ig, '-').toLowerCase() + '-' + generateRpCode(3);

            await DB.addDoc(rpNamespace, 'readCode', 'readCode', { readCode }, { userid, ip });
            await DB.addDoc('system', 'urls', rpCode, { rpNamespace, access: 'normal' }, { userid, ip });
            await DB.addDoc('system', 'urls', readCode, { rpNamespace, access: 'read' }, { userid, ip });

            importStatus.set(rpCode, { status: 'success' })
        });
    });

    return req.pipe(busboy);
}));

router.post('/rp/import/:rpCode([-0-9a-zA-Z]{1,100})', awrap(async (req, res, next) => {
    const info = importStatus.get(req.params.rpCode);
    if (!info) return res.status(404).json({ error: 'Import expired' })
    return res.status(200).json(info);
}));

/**
 * Generate a new set of credentials for an anonymous user
 */
router.post('/user', awrap(async (req, res, next) => {
    const credentials = await generateAnonCredentials();
    res.status(200).json(credentials);
}));

/**
 * Verify user using authMiddleware and return OK
 */
router.get('/user/verify', authMiddleware, (req, res, next) => {
    res.sendStatus(204);
})

const rpGroup = '/rp/:rpCode([-0-9a-zA-Z]{1,100})';

/**
 * Get current state of a RP chatroom
 */
router.get(`${rpGroup}`, awrap(async (req, res, next) => {
    const { rpNamespace, access } = await DB.getDoc('system', 'urls', req.params.rpCode);
    if (access === 'read') return res.sendStatus(403);

    const lastEventId = await DB.lastEventId();
    const { title, desc } = await DB.getDoc(rpNamespace, 'meta', 'meta', { snapshot: lastEventId });
    const { readCode } = await DB.getDoc(rpNamespace, 'readCode', 'readCode', { snapshot: lastEventId });
    const msgs = await DB.getDocs(rpNamespace, 'msgs', { reverse: true, limit: 60, snapshot: lastEventId }).asArray();
    msgs.reverse();
    const charas = await DB.getDocs(rpNamespace, 'charas', { snapshot: lastEventId }).asArray();

    res.status(200).json({ title, desc, msgs, charas, lastEventId, readCode })
}));

/**
 * Get updates on an RP since some prior state
 */
router.get(`${rpGroup}/updates`, awrap(async (req, res, next) => {
    const { rpNamespace } = await DB.getDoc('system', 'urls', req.params.rpCode);

    const { since } = req.query;
    if (!since) throw new Error('Missing since');

    const docs = await DB.getDocs(rpNamespace, null, { since, includeMeta: true }).asArray();

    const updates = docs.map(({ _meta, ...doc }) => ({ data: doc, type: _meta.collection }));
    const lastEventId = Math.max(since, ...docs.map(({ _meta }) => _meta.event_id));

    res.status(200).json({ lastEventId, updates });
}));

/**
 * Count the pages in an RP's archive
 */
router.get(`${rpGroup}/pages`, awrap(async (req, res, next) => {
    const { rpNamespace } = await DB.getDoc('system', 'urls', req.params.rpCode);

    const lastEventId = await DB.lastEventId();
    const { title, desc } = await DB.getDoc(rpNamespace, 'meta', 'meta', { snapshot: lastEventId });

    const msgCount = await DB.getDocs(rpNamespace, 'msgs').count();
    const pageCount = Math.ceil(msgCount / 20);

    res.status(200).json({ title, desc, pageCount, lastEventId })
}));

/**
 * Get a page from an RP's archive
 */
router.get(`${rpGroup}/pages/:pageNum([1-9][0-9]{0,})`, awrap(async (req, res, next) => {
    const { rpNamespace } = await DB.getDoc('system', 'urls', req.params.rpCode);

    const skip = (req.params.pageNum - 1) * 20;
    const limit = 20;

    const lastEventId = await DB.lastEventId();
    const { title, desc } = await DB.getDoc(rpNamespace, 'meta', 'meta', { snapshot: lastEventId });
    const msgs = await DB.getDocs(rpNamespace, 'msgs', { skip, limit, snapshot: lastEventId }).asArray();
    const charas = await DB.getDocs(rpNamespace, 'charas', { snapshot: lastEventId }).asArray();

    const msgCount = await DB.getDocs(rpNamespace, 'msgs').count();
    const pageCount = Math.ceil(msgCount / 20);

    res.status(200).json({ title, desc, msgs, charas, pageCount, lastEventId })
}));

/**
 * Get and download a .txt file for an entire RP
 */
router.get(`${rpGroup}/download.txt`, awrap(async (req, res, next) => {
    const { rpNamespace } = await DB.getDoc('system', 'urls', req.params.rpCode);

    const { title, desc } = await DB.getDoc(rpNamespace, 'meta', 'meta');
    // TODO getting all msgs at once is potentially problematic for huge RP's; consider using streams if possible
    const msgs = await DB.getDocs(rpNamespace, 'msgs').asArray(); 
    const charasMap = await DB.getDocs(rpNamespace, 'charas').asMap();
    const { includeOOC = false } = req.query;

    res.attachment(`${title}.txt`).type('.txt');
    generateTextFile({ title, desc, msgs, charasMap, includeOOC }, str => res.write(str));
    res.end();
}));

/**
 * Get and download a .txt file for an entire RP
 */
router.get(`${rpGroup}/export`, awrap(async (req, res, next) => {
    const { rpNamespace } = await DB.getDoc('system', 'urls', req.params.rpCode);
    const { title } = await DB.getDoc(rpNamespace, 'meta', 'meta');

    res.attachment(`${title}.json`).type('.json');
    await exportRp(rpNamespace, str => res.write(str));
    res.end();
}));

/**
 * Create something in an RP (message, chara, etc)
 */
router.post(`${rpGroup}/:collection([a-z]+)`, authMiddleware, awrap(async (req, res, next) => {
    const { rpNamespace, access } = await DB.getDoc('system', 'urls', req.params.rpCode);
    if (access === 'read') return res.sendStatus(403);
    const collection = req.params.collection;
    const _id = cuid();
    const fields = req.body;
    await validate(rpNamespace, collection, fields); // TODO or throw BAD_RP
    const { userid } = req.user;
    const ip = req.ip;

    const { doc } = await DB.addDoc(rpNamespace, collection, _id, fields, { userid, ip });

    res.status(201).json(doc);
}));

/**
 * Update something in an RP (message, chara, etc)
 */
router.put(`${rpGroup}/:collection([a-z]+)/:doc_id([a-z0-9]+)`, authMiddleware, awrap(async (req, res, next) => {
    const { rpNamespace, access } = await DB.getDoc('system', 'urls', req.params.rpCode);
    if (access === 'read') return res.sendStatus(403);
    const collection = req.params.collection;
    const _id = req.params.doc_id;
    const fields = req.body;
    await validate(rpNamespace, collection, fields); // TODO or throw BAD_RP
    const { userid } = req.user;
    const ip = req.ip;

    const oldDoc = await DB.getDoc(rpNamespace, collection, _id);
    if (!oldDoc) return res.sendStatus(404);

    const { doc } = await DB.updateDoc(rpNamespace, collection, _id, fields, { userid, ip });

    res.status(200).json(doc);
}));

/**
 * Get the history of something in an RP (message, chara, etc)
 */
router.get(`${rpGroup}/:collection([a-z]+)/:doc_id([a-z0-9]+)/history`, awrap(async (req, res, next) => {
    const { rpNamespace } = await DB.getDoc('system', 'urls', req.params.rpCode);
    const collection = req.params.collection;
    const _id = req.params.doc_id;

    const docs = await DB.getDocs(rpNamespace, collection, { _id, includeHistory: true }).asArray();

    res.status(200).json(docs);
}));

/**
 * Default route (route not found)
 */
router.all('*', (req, res, next) => {
    next({ code: 'UNKNOWN_REQUEST' });
});

/**
 * Error handling
 */
router.use((err, req, res, next) => {
    debug(err);
    res.status(500).json({ error: err.toString() });
});

module.exports = router;
