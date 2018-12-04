const { promisify } = require('util');
const crypto = require('crypto');

const randomBytes = promisify(crypto.randomBytes);

function hashString(str) {
    return crypto.createHash('sha512')
        .update(str)
        .digest('hex');
}

module.exports = {
    async generateAnonCredentials() {
        const secret = (await randomBytes(32)).toString('hex');
        const secretHash = hashString(secret);

        return { secret, secretHash };
    },

    verifyAnonCredentials(secret, secretHash) {
        return hashString(secret) === secretHash;
    },
};
