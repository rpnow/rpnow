const { generateChallenge, verifyChallenge } = require('./challenge');

describe('challenges', () => {
    it('will verify', async (done) => {
        const { secret, hash } = await generateChallenge();
        const result = verifyChallenge(secret, hash);
        expect(result).toBe(true);
        done();
    });

    it('will reject invalid', async (done) => {
        const { secret } = await generateChallenge(); // separate
        const { hash } = await generateChallenge(); // separate
        const result = verifyChallenge(secret, hash);
        expect(result).toBe(false);
        done();
    });
});
