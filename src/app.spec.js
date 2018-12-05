const test = require('ava');
const request = require('supertest');
const app = require('./app');

test('GET challenge.json', async t => {
    const { status, body } = await request(app).get('/api/challenge.json');
    t.is(status, 200);
    t.is(typeof body.secret, 'string');
    t.is(typeof body.secretHash, 'string');
});
