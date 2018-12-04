const crypto = require('crypto');

module.exports = {
    getColorsForIp(ip) {
        return crypto.createHash('md5')
            .update(ip)
            .digest('hex')
            .substr(0, 18);
    }
};
