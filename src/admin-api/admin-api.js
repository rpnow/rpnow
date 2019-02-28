const express = require('express');
const debug = require('debug')('rpnow');
const DB = require('../services/database');
const { awrap } = require('../services/express-async-handler');

const app = express();
app.use(express.json());

/**
 * Health check to see if the server is alive and responding
 */
app.get('/health', (req, res) => {
    res.status(200).json({rpnow:'ok'})
})

/**
 * List all RPs
 */
app.get('/rp', awrap(async (req, res) => {
    const headers = await DB.getDocs('rp_*', 'meta', { includeMeta: true });
    const urls = await DB.getDocs('system', 'urls', { includeMeta: true });

    res.status(200).json({ urls });
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
