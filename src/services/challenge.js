const { promisify } = require('util');
const crypto = require('crypto');

function createHash(secret) {
    return crypto.createHash('sha512')
        .update(secret)
        .digest('hex');
}

module.exports = {
    async generateChallenge() {
        const buf = await promisify(crypto.randomBytes)(32);

        const secret = buf.toString('hex');
        const hash = createHash(secret);

        return { secret, hash };
    },

    verifyChallenge(secret, hash) {
        return createHash(secret) === hash;
    },
};
