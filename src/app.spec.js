const test = require('ava');
const request = require('supertest');
const app = require('./app');

const api = request(app);

const createRp = async ({ title } = { title: 'Test' }) => (await api.post('/api/rp').send({ title })).body;
const getRpState = async (rpCode) => (await api.get(`/api/rp/${rpCode}`)).body;

test('GET challenge', async t => {
    const { status, body } = await api.get('/api/challenge');
    t.is(status, 200);
    t.is(typeof body.secret, 'string');
    t.is(typeof body.secretHash, 'string');
});

test('Create new RP', async t => {
    const { status, body } = await api.post('/api/rp').send({ title: 'Test' });
    t.is(status, 201);
    t.deepEqual(Object.keys(body), ['rpCode'])
});

test('GET an error for the wrong rpCode', async t => {
    const { status } = await api.get('/api/rp/badd-urll-badd-urll-badd');
    t.is(status, 500);
});

test('Initial RP state', async t => {
    const { rpCode } = await createRp();
    const { status, body } = await api.get(`/api/rp/${rpCode}`);
    t.is(status, 200);
    t.is(body.title, 'Test');
    t.deepEqual(body.msgs, []);
    t.deepEqual(body.charas, []);
    t.is(typeof body.lastEventId, 'number');
});
