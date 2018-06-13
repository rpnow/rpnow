const request = require('request-promise-native');
const nJ = require('normalize-json');
const EventEmitter = require('events');
const config = require('./config');
const dao = require('./dao/dao.mongo');
const { generateRpCode } = require('./services/rpcode.js');
const { verifyChallenge } = require('./services/challenge');

class RpEventEmitter extends EventEmitter {}
const events = new RpEventEmitter();

const roomOptionsSchema = nJ({
    title: [String, config.get('maxTitleLength')],
    desc: [{ $optional: String }, config.get('maxDescLength')],
});
const addCharaSchema = nJ({
    name: [String, config.get('maxCharaNameLength')],
    color: /^#[0-9a-f]{6}$/g,
});
const addMessageSchema = nJ({
    content: [String, config.get('maxMessageContentLength')],
    type: ['narrator', 'chara', 'ooc'],
    charaId: msg => (msg.type === 'chara' ? [String] : undefined),
    challenge: [String, 128],
});
const editMessageSchema = nJ({
    id: [String],
    content: [String, config.get('maxMessageContentLength')],
    secret: [String, 64],
});

module.exports = ({
    events,

    async createRp(input) {
        let roomOptions;
        try {
            roomOptions = roomOptionsSchema(input);
        } catch (error) {
            throw { code: 'BAD_RP', details: error.message };
        }

        const rpCode = generateRpCode();
        await dao.addRoom(rpCode, roomOptions);

        return { rpCode };
    },

    async getRp(rpCode) {
        if (typeof rpCode !== 'string') throw { code: 'BAD_RPCODE' };

        const data = await dao.getRoomByCode(rpCode);
        if (!data) throw { code: 'RP_NOT_FOUND' };

        return data;
    },

    async addMessage(rpCode, connectionId, input, ipid) {
        let msg;
        try {
            msg = addMessageSchema(input);
        } catch (error) {
            throw { code: 'BAD_MSG', details: error.message };
        }

        // store & broadcast
        if (msg.type === 'chara') {
            // charas must be in the chara list
            const exists = await dao.charaExists(rpCode, msg.charaId);
            if (!exists) throw { code: 'CHARA_NOT_FOUND', details: `no character with id ${msg.charaId}` };
        }

        msg.timestamp = Date.now() / 1000;
        msg.ipid = ipid;

        await dao.addMessage(rpCode, msg);

        events.emit('add message', rpCode, connectionId, msg);
        return msg;
    },

    async addImage(rpCode, connectionId, url, ipid) {
        if (typeof url !== 'string') throw { code: 'BAD_URL' };

        // validate image
        let res;
        try {
            res = await request.head(url);
        } catch (err) {
            throw { code: 'URL_FAILED', details: err.message };
        }
        if (!res['content-type']) throw { code: 'UNKNOWN_CONTENT' };
        if (!res['content-type'].startsWith('image/')) throw { code: 'BAD_CONTENT' };

        // store & broadcast
        const msg = {
            type: 'image',
            url,
        };

        msg.timestamp = Date.now() / 1000;
        msg.ipid = ipid;

        await dao.addMessage(rpCode, msg);

        events.emit('add message', rpCode, connectionId, msg);
        return msg;
    },

    async addChara(rpCode, connectionId, inputChara /* ,ipid */) {
        let chara;
        try {
            chara = addCharaSchema(inputChara);
        } catch (error) {
            throw { code: 'BAD_CHARA', details: error.message };
        }

        await dao.addChara(rpCode, chara);

        events.emit('add character', rpCode, connectionId, chara);
        return chara;
    },

    async editMessage(rpCode, connectionId, input /* ,ipid */) {
        let editInfo;
        try {
            editInfo = editMessageSchema(input);
        } catch (error) {
            throw { code: 'BAD_EDIT', details: error.message };
        }

        // check if the message is there
        const msg = await dao.getMessage(rpCode, editInfo.id);
        if (!msg) throw { code: 'BAD_MSG_ID' };

        if (!verifyChallenge(editInfo.secret, msg.challenge)) throw { code: 'BAD_SECRET' };

        msg.content = editInfo.content;
        msg.edited = (Date.now() / 1000);

        await dao.editMessage(rpCode, editInfo.id, msg);

        events.emit('edit message', rpCode, connectionId, msg, editInfo.id);
        return msg;
    },
});
