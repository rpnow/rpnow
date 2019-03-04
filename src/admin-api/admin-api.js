const express = require('express');
const debug = require('debug')('rpnow');
const DB = require('../services/database');
const { awrap } = require('../services/express-async-handler');

const app = express();
app.use(express.json());

/**
 * Health check to see if the server is alive and responding
 */
app.get('/status', (req, res) => {
    res.status(200).json({
        rpnow: 'ok',
        pid: process.pid,
    })
});

/**
 * List all RPs
 */
app.get('/rps', awrap(async (req, res) => {
    const docs = await DB.getDocs('rp_*', 'meta', { includeMeta: true }).asArray();
    const rps = docs.map(({ title, _meta, timestamp }) => ({ title, rpid: _meta.namespace, timestamp }))

    res.status(200).json(rps);
}));

/**
 * Get link info for an RP
 */
app.get('/rps/:rpid', awrap(async (req, res) => {
    const allUrls = await DB.getDocs('system', 'urls').asArray();
    const myUrls = allUrls
        .filter(({rpNamespace}) => rpNamespace === req.params.rpid)
        .map(({_id, access}) => ({ url: _id, access }));

    res.status(200).json(myUrls);
}));

/**
 * Permanently delete an RP
 */
app.delete('/rps/:rpid', awrap(async (req, res) => {
    const myUrls = (await DB.getDocs('system', 'urls').asArray())
        .filter(({rpNamespace}) => rpNamespace === req.params.rpid)
        .map(({_id}) => _id);
    for (const url of myUrls) {
        await DB.updateDoc('system', 'urls', url, null)
    }
    await DB.getDocs(req.params.rpid, null, { includeHistory: true }).purge();
    res.sendStatus(204);
}));

/**
 * Remove an RP's link
 */
app.delete('/url/:url', awrap(async (req, res) => {
    await DB.updateDoc('system', 'urls', req.params.url, null)
    res.sendStatus(204);
}));

/**
 * Set a link for an RP
 */
app.put('/url/:url', awrap(async (req, res) => {
    const { rpNamespace, access } = req.body;
    await DB.putDoc('system', 'urls', req.params.url, { rpNamespace, access })
    res.sendStatus(204);
}));

/**
 * Default route (route not found)
 */
app.all('*', (req, res, next) => {
    next({ code: 'UNKNOWN_REQUEST' });
});

/**
 * Error handling
 */
app.use((err, req, res) => {
    debug(err);
    res.status(500).json({ error: err.toString() });
});

module.exports = app;
