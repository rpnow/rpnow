const test = require('ava');
const { generateAnonCredentials, verifyAnonCredentials } = require('./anon-credentials');

test('will verify', async t => {
    const { secret, secretHash } = await generateAnonCredentials();
    const result = verifyAnonCredentials(secret, secretHash);
    t.is(result, true);
});

test('will reject invalid', async t => {
    const { secret } = await generateAnonCredentials(); // separate
    const { secretHash } = await generateAnonCredentials() // separate
    const result = verifyAnonCredentials(secret, secretHash);
    t.is(result, false);
});
