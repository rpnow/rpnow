const nJ = require('normalize-json');
const got = require('got');

// TODO integrate all this info into the validators
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
    charaId: msg => (msg.type === 'chara' ? [String] : undefined), // TODO validate chara exists?
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

const validators = {
    async msgs(body) {
        const { type } = body;
        if (type === 'image') {
            const { url = null } = body;
            if (typeof url !== 'string') throw { code: 'BAD_URL' }
            // validate image
            let res;
            try {
                res = await got.head(url);
            } catch (err) {
                throw { code: 'URL_FAILED', details: err.message };
            }
            if (!res.headers['content-type']) throw { code: 'UNKNOWN_CONTENT' };
            if (!res.headers['content-type'].startsWith('image/')) throw { code: 'BAD_IMAGE_CONTENT_TYPE' };
            // ok
            return { type, url };
        }
        else if (type === 'chara') {
            const { content, charaId } = body;
            // TODO validate chara exists?
            return { type, content, charaId };
        }
        else {
            const { content } = body;
            return { type, content };
        }
    },
    async charas(body) {
        const { name, color } = body;
        return { name, color };
    },
    async meta(body) {
        const { title, desc } = body;
        return { title, desc };
    },
}

async function validate(collection, body) {
    if (!validators[collection]) throw new Error('Invalid collection');
    return validators[collection](body);
}

module.exports = validate;
