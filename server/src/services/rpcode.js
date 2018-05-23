const config = require('../config');
const nanoid = require('nanoid/generate');

module.exports.generateRpCode = function() {
    let length = config.get('rpCodeLength');
    let characters = config.get('rpCodeChars');

    let rpCode = nanoid(characters, length);

    return rpCode;
}

