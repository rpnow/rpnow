const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const expressJwt = require('express-jwt');
const cuid = require('cuid');
const DB = require('./database');

const jwtSecretPromise = (async function getJwtSecret() {
    if (await DB.hasDoc('system', 'secrets', 'jwt')) {
        const doc = await DB.getDoc('system', 'secrets', 'jwt');
        return Buffer.from(doc.secret, 'hex');
    } else {
        const jwtSecret = crypto.randomBytes(256/8)
        await DB.addDoc('system', 'secrets', 'jwt', { secret: jwtSecret.toString('hex') });
        return jwtSecret;
    }
})();

module.exports = {
    async generateAnonCredentials() {
        const userid = 'anon:' + cuid();
        const token = jwt.sign({ userid }, await jwtSecretPromise);
        return { userid, token };
    },

    async authMiddleware(req, res, next) {
        expressJwt({ secret: await jwtSecretPromise })(req, res, next);
    },
};
