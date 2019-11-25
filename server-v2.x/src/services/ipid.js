const crypto = require('crypto');

module.exports.getIpid = function getIpid(ip) {
    return crypto.createHash('md5')
        .update(ip)
        .digest('hex')
        .substr(0, 18);
};
