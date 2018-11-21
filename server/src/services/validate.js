const validators = {
    async msgs(body) {
        const { type } = body;
        if (type === 'image') {
            const { url } = body;
            return { type, url };
        }
        else if (type === 'chara') {
            const { content, charaId } = body;
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
