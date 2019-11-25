const nanoid = require('nanoid/generate');

module.exports = {
    generateRpCode(numDigitGroups) {
        const length = 4 * numDigitGroups;
        const characters = 'abcdefhjknpstxyz23456789';

        const rpCode = nanoid(characters, length).match(/.{4}/g).join('-');

        return rpCode;
    }
};
