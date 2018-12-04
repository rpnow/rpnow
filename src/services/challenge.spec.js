const { generateAnonCredentials, verifyAnonCredentials } = require('./challenge');

describe('challenges', () => {
    it('will verify', async (done) => {
        const { secret, hash } = await generateAnonCredentials();
        const result = verifyAnonCredentials(secret, hash);
        expect(result).toBe(true);
        done();
    });

    it('will reject invalid', async (done) => {
        const { secret } = await generateAnonCredentials(); // separate
        const { hash } = await generateAnonCredentials(); // separate
        const result = verifyAnonCredentials(secret, hash);
        expect(result).toBe(false);
        done();
    });
});
