const config = require('../config');
const nanoid = require('nanoid/generate');

module.exports.generateRpCode = function generateRpCode() {
    const length = config.get('rpCodeLength');
    const characters = config.get('rpCodeChars');

    const rpCode = nanoid(characters, length);

    return rpCode;
};

