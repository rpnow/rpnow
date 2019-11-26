const express = require('express');
const addWs = require('express-ws');
const path = require('path');
const Busboy = require('busboy');
const debug = require('debug')('rpnow');
const { generateTextFile } = require('./services/txt-file');
const { exportRp, importRp } = require('./services/json-file');
const { xRobotsTag } = require('./services/express-x-robots-tag-middleware');
const cuid = require('cuid');
const DB = require('./services/database');
const { validate } = require('./services/validate-user-documents');
const { generateRpCode } = require('./services/generate-rp-code');
const { generateAnonCredentials, authMiddleware } = require('./services/anon-credentials');
const { awrap } = require('./services/express-async-handler');
const { publish, subscribe } = require('./services/events');

const server = express();
addWs(server);

const staticRoutes = new express.Router();
const bundleDir = path.join(__dirname, 'dist');

// bundle
staticRoutes.use('/', express.static(bundleDir));

// valid routes
const indexHTML = (req, res) => res.sendFile(`${bundleDir}/index.html`);
staticRoutes.get('/', indexHTML);
staticRoutes.get('/login', indexHTML);
staticRoutes.get('/register', indexHTML);
staticRoutes.get('/import', indexHTML);
staticRoutes.get('/format', indexHTML);
staticRoutes.get('/rp/:rpCode', indexHTML);
staticRoutes.get('/read/:rpCode', indexHTML);
staticRoutes.get('/read/:rpCode/page/:page', indexHTML);

// API
const api = new express.Router();
api.use(express.json({ limit: '100mb' }));
api.use(xRobotsTag);

/**
 * Health check to see if the server is alive and responding
 */
api.get('/health', (req, res, next) => {
    res.status(200).json({rpnow:'ok'})
})

/**
 * Create a new RP
 */
api.post('/rp', authMiddleware, awrap(async (req, res, next) => {
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

api.post('/rp/import', authMiddleware, awrap(async (req, res, next) => {
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

api.post('/rp/import/:rpCode([-0-9a-zA-Z]{1,100})', awrap(async (req, res, next) => {
    const info = importStatus.get(req.params.rpCode);
    if (!info) return res.status(404).json({ error: 'Import expired' })
    return res.status(200).json(info);
}));

/**
 * Generate a new set of credentials for an anonymous user
 */
api.post('/user/anon', awrap(async (req, res, next) => {
    const credentials = await generateAnonCredentials();
    res.status(200).json(credentials);
}));

/**
 * Verify user using authMiddleware and return OK
 */
api.get('/user/verify', authMiddleware, (req, res, next) => {
    res.sendStatus(204);
})

/**
 * Dashboard
 */
api.post('/dashboard', (req, res, next) => {
    // TODO
    res.status(200).json({
        canCreate: true,
        rooms: []
    });
});

const rpGroup = '/rp/:rpCode([-0-9a-zA-Z]{1,100})';

/**
 * Get current state of a RP chatroom
 */
api.ws(`${rpGroup}/chat`, async (ws, req, next) => {
    const ip = req.headers['x-forwarded-for'];
    // const ip = req.connection.remoteAddress;

    const rpCode = req.params.rpCode;

    try {
        const { rpNamespace, access } = await DB.getDoc('system', 'urls', rpCode);
        if (access === 'read') {
            return ws.close(4403, 'This code can only be used to view an RP, not to write one.');
        }

        const send = (data) => {
            if (ws.readyState === 1) {
                ws.send(JSON.stringify(data));
            } else {
                debug(`NRDY (${ip}): ${rpCode} - tried to send data at readyState ${ws.readyState}`);
            }
        };

        // TODO ensure import is not in progress

        const snapshot = await DB.lastEventId();
        const { title, desc } = await DB.getDoc(rpNamespace, 'meta', 'meta', { snapshot });
        const { readCode } = await DB.getDoc(rpNamespace, 'readCode', 'readCode', { snapshot });
        const msgs = await DB.getDocs(rpNamespace, 'msgs', { reverse: true, limit: 60, snapshot }).asArray();
        msgs.reverse();
        const charas = await DB.getDocs(rpNamespace, 'charas', { snapshot }).asArray();

        send({
            type: 'init',
            data: {
                title, desc, msgs, charas, readCode
            }
        });

        debug(`JOIN (${ip}): ${rpCode}`);

        const unsub = subscribe(rpNamespace, send);

        let alive = true;

        (function scheduleHeartbeat() {
            setTimeout(() => {
                if (ws.readyState === 2 || ws.readyState === 3) {
                    // socket is closing or closed. no pinging
                } else if (alive) {
                    alive = false;
                    ws.ping();
                    scheduleHeartbeat();
                } else {
                    debug(`DIED (${ip}): ${rpCode}`);
                    ws.terminate();
                }
            }, 30000);
        }());
        ws.on('pong', () => {
            debug(`PONG (${ip}): ${rpCode}`);
            alive = true;
        });

        ws.on('close', (code, reason) => {
            debug(`EXIT (${ip}): ${rpCode} - ${code} ${reason}`);
            unsub();
        });
    } catch (err) {
        ws.close(4400, err.message);
        debug(`JERR (${ip}): ${err.message}`);
    }
});

/**
 * Count the pages in an RP's archive
 */
api.get(`${rpGroup}/pages`, awrap(async (req, res, next) => {
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
api.get(`${rpGroup}/pages/:pageNum([1-9][0-9]{0,})`, awrap(async (req, res, next) => {
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
api.get(`${rpGroup}/download.txt`, awrap(async (req, res, next) => {
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
api.get(`${rpGroup}/export`, awrap(async (req, res, next) => {
    const { rpNamespace } = await DB.getDoc('system', 'urls', req.params.rpCode);
    const { title } = await DB.getDoc(rpNamespace, 'meta', 'meta');

    res.attachment(`${title}.json`).type('.json');
    await exportRp(rpNamespace, str => res.write(str));
    res.end();
}));

/**
 * Create something in an RP (message, chara, etc)
 */
api.post(`${rpGroup}/:collection([a-z]+)`, authMiddleware, awrap(async (req, res, next) => {
    const { rpNamespace, access } = await DB.getDoc('system', 'urls', req.params.rpCode);
    if (access === 'read') return res.sendStatus(403);
    const collection = req.params.collection;
    const _id = cuid();
    const fields = req.body;
    await validate(rpNamespace, collection, fields); // TODO or throw BAD_RP
    const { userid } = req.user;
    const ip = req.ip;

    const { doc } = await DB.addDoc(rpNamespace, collection, _id, fields, { userid, ip });

    publish(rpNamespace, { type: collection, data: doc })

    res.status(201).json(doc);
}));

/**
 * Update something in an RP (message, chara, etc)
 */
api.put(`${rpGroup}/:collection([a-z]+)/:doc_id([a-z0-9]+)`, authMiddleware, awrap(async (req, res, next) => {
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

    publish(rpNamespace, { type: collection, data: doc })

    res.status(200).json(doc);
}));

/**
 * Get the history of something in an RP (message, chara, etc)
 */
api.get(`${rpGroup}/:collection([a-z]+)/:doc_id([a-z0-9]+)/history`, awrap(async (req, res, next) => {
    const { rpNamespace } = await DB.getDoc('system', 'urls', req.params.rpCode);
    const collection = req.params.collection;
    const _id = req.params.doc_id;

    const docs = await DB.getDocs(rpNamespace, collection, { _id, includeHistory: true }).asArray();

    res.status(200).json(docs);
}));

/**
 * Default route (route not found)
 */
api.all('*', (req, res, next) => {
    next({ code: 'UNKNOWN_REQUEST' });
});

/**
 * Error handling
 */
api.use((err, req, res, next) => {
    debug(err);
    res.status(500).json({ error: err.toString() });
});

server.use('/api', api);
server.use('/', staticRoutes);

module.exports = server;
