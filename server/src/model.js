const request = require('request-promise-native');
const nJ = require('normalize-json');
const { publish } = require('./events');
const dao = require('./dao');
const { generateRpCode } = require('./services/rpcode.js');
const { verifyChallenge } = require('./services/challenge');
const errors = require('./errors');

const roomOptionsSchema = nJ({
    title: [String, 30],
    desc: [{ $optional: String }, 255],
});
const addCharaSchema = nJ({
    name: [String, 30],
    color: /^#[0-9a-f]{6}$/g,
    challenge: [String, 128],
});
const addMessageSchema = nJ({
    content: [String, 10000],
    type: ['narrator', 'chara', 'ooc'],
    charaId: msg => (msg.type === 'chara' ? [String] : undefined),
    challenge: [String, 128],
});
const editCharaSchema = nJ({
    id: [String],
    name: [String, 30],
    color: /^#[0-9a-f]{6}$/g,
    secret: [String, 64],
});
const editMessageSchema = nJ({
    id: [String],
    content: [String, 10000],
    secret: [String, 64],
});

async function checkRpCode(rpCode) {
    if (typeof rpCode !== 'string') throw errors.badRpCode;
    if (rpCode.length > 500) throw errors.badRpCode;
}

module.exports = ({
    async createRp(input, ipid) {
        let roomOptions;
        try {
            roomOptions = roomOptionsSchema(input);
        } catch (error) {
            throw { code: 'BAD_RP', details: error.message };
        }

        roomOptions.timestamp = Date.now() / 1000;
        roomOptions.ipid = ipid;

        const rpCode = generateRpCode();
        await dao.addRoom(rpCode, roomOptions);

        return { rpCode };
    },

    async getRpWithMessageStream(rpCode) {
        await checkRpCode(rpCode);

        const [meta, msgStream, charas] = await Promise.all([
            dao.getRoomMeta(rpCode),
            dao.getRoomMessagesStream(rpCode),
            dao.getRoomCharas(rpCode),
        ]);
        return { ...meta, msgStream, charas };
    },

    async getPage(rpCode, pageNum) {
        await checkRpCode(rpCode);
        if (typeof pageNum !== 'number') throw { code: 'BAD_PAGE' };

        const limit = 20;
        const skip = (pageNum - 1) * limit;

        const [meta, msgs, charas, msgCount] = await Promise.all([
            dao.getRoomMeta(rpCode),
            dao.getRoomMessagesSkipLimit(rpCode, skip, limit),
            dao.getRoomCharas(rpCode),
            dao.getRoomMessageCount(rpCode),
        ]);

        const pageCount = Math.ceil(msgCount / limit);

        return { ...meta, msgs, charas, msgCount, pageCount };
    },

    async getLatest(rpCode) {
        await checkRpCode(rpCode);

        const [meta, msgs, charas] = await Promise.all([
            dao.getRoomMeta(rpCode),
            dao.getRoomMessagesLatest(rpCode, 60),
            dao.getRoomCharas(rpCode),
        ]);
        return { ...meta, msgs, charas };
    },

    async addMessage(rpCode, input, ipid) {
        await checkRpCode(rpCode);

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

        msg._id = await dao.addMessage(rpCode, msg);

        publish(rpCode, { type: 'append', data: { msgs: [msg] } });
        return msg;
    },

    async addImage(rpCode, input, ipid) {
        await checkRpCode(rpCode);

        const url = input && input.url;
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

        msg._id = await dao.addMessage(rpCode, msg);

        publish(rpCode, { type: 'append', data: { msgs: [msg] } });
        return msg;
    },

    async addChara(rpCode, inputChara, ipid) {
        await checkRpCode(rpCode);

        let chara;
        try {
            chara = addCharaSchema(inputChara);
        } catch (error) {
            throw { code: 'BAD_CHARA', details: error.message };
        }

        chara.timestamp = Date.now() / 1000;
        chara.ipid = ipid;

        chara._id = await dao.addChara(rpCode, chara);

        publish(rpCode, { type: 'append', data: { charas: [chara] } });
        return chara;
    },

    async editMessage(rpCode, input /* ,ipid */) {
        await checkRpCode(rpCode);

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

        publish(rpCode, { type: 'put', data: { msgs: [msg] } });
        return msg;
    },

    async editChara(rpCode, input /* ,ipid */) {
        await checkRpCode(rpCode);

        let editInfo;
        try {
            editInfo = editCharaSchema(input);
        } catch (error) {
            throw { code: 'BAD_EDIT', details: error.message };
        }

        // check if the message is there
        const chara = await dao.getChara(rpCode, editInfo.id);
        if (!chara) throw { code: 'BAD_MSG_ID' };

        if (!verifyChallenge(editInfo.secret, chara.challenge)) throw { code: 'BAD_SECRET' };

        chara.name = editInfo.name;
        chara.color = editInfo.color;
        chara.edited = (Date.now() / 1000);

        await dao.editChara(rpCode, editInfo.id, chara);

        publish(rpCode, { type: 'put', data: { charas: [chara] } });
        return chara;
    },
});
