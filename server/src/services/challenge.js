const promisify = require('util').promisify;
const crypto = require('crypto');

module.exports.generateChallenge = async function() {
    let buf = await promisify(crypto.randomBytes)(32);

    let secret = buf.toString('hex');
    let hash = createHash(secret);

    return {secret, hash};
};

function createHash(secret) {
    return crypto.createHash('sha512')
        .update(secret)
        .digest('hex');
}

module.exports.verifyChallenge = function(secret, hash) {
    return createHash(secret) === hash;
}