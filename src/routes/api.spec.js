const test = require('ava');
const express = require('express');
const request = require('supertest');
const apiRoutes = require('./api');
const DB = require('../services/database');

const app = express();
app.use('/api', apiRoutes);
const api = request(app);

test.before(async () => {
    await DB.open(':memory:');
})

test('Health check', async t => {
    const { status, body } = await api.get('/api/health');
    t.is(status, 200);
    t.is(body.rpnow, 'ok');
});

// Create user & verify

// Invalid user

// Import RP, data retrieval matches exactly

// Import RP, exports exactly the same

// Export TXT matches sample exactly

// Get state updates

// History works correctly

// POST and PUT validation

// Can't use readCode for rpCode
