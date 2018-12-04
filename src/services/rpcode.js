const nanoid = require('nanoid/generate');

module.exports = {
    generateRpCode() {
        const length = 20;
        const characters = 'abcdefhjknpstxyz23456789';

        const rpCode = nanoid(characters, length).match(/.{4}/g).join('-');

        return rpCode;
    }
};
