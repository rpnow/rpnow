const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const expressJwt = require('express-jwt');
const cuid = require('cuid');
const config = require('./config');

const jwtSecretDir = config.dataDir;
const jwtSecretFile = path.join(config.dataDir, 'valid-users.key');

if (!fs.existsSync(jwtSecretDir)) {
    fs.mkdirSync(jwtSecretDir);
}

if (!fs.existsSync(jwtSecretFile)) {
    const jwtSecret = crypto.randomBytes(256/8);
    fs.writeFileSync(jwtSecretFile, jwtSecret);
}

const jwtSecret = fs.readFileSync(jwtSecretFile);

module.exports = {
    generateAnonCredentials() {
        const userid = 'anon:' + cuid();
        const token = jwt.sign({ userid }, jwtSecret);
        return { userid, token };
    },

    authMiddleware: expressJwt({ secret: jwtSecret }),
};
