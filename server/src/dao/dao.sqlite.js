const knex = require('knex');
// const errors = require('../errors');

const orm = knex({
    client: 'sqlite3',
    connection: {
        filename: 'data.sqlite3',
    },
    // connection: ':memory:',
});

const connected = (async function connect() {
    if (!(await orm.schema.hasTable('docs'))) {
        await orm.schema.createTable('docs', (t) => {
            t.increments('event_id').primary();
            t.string('doc_id', 64).notNullable();
            t.string('namespace').notNullable();
            t.integer('revision_age').defaultTo(0).notNullable();
            t.json('body', 50000).nullable();
            t.timestamp('timestamp').defaultTo(orm.fn.now()).notNullable();
            t.string('ip', 47).nullable();

            t.unique(['doc_id', 'namespace', 'revision_age']);
            t.index('doc_id');
            t.index('namespace');
            t.index('revision_age');
            t.index('timestamp');
            t.index('ip');
        });
    }
}());

const getDocs = async ({ namespace, allVersions = false, where = null, prefix = null }) => {
    await connected;

    let query = orm('docs');

    if (namespace !== null) {
        query = query.where('namespace', namespace);
    }
    if (!allVersions) {
        query = query.where('revision_age', 0);
    }
    if (where) {
        query = query.where(where);
    }
    if (prefix) {
        query = query.whereRaw('doc_id like ?', [`${prefix}%`]);
    }

    query = query.orderBy('event_id', 'asc');

    return query;
};

const putDoc = async ({ id, namespace = null, ip, ...body }) => {
    await connected;
    return knex.transaction(async (tx) => {
        await tx('docs').where('doc_id', id).update('revision_age', 'revision_age + 1');
        await tx('docs').insert({ doc_id: id, namespace, ip, body: JSON.stringify(body) });
    });
};

const getRpNamespace = async (rpCode) => {
    const [doc] = await getDocs({ namespace: null, where: { doc_id: rpCode } });
    return doc.namespace;
};

const getDocsForRp = async ({ rpCode, ...args }) => {
    const namespace = await getRpNamespace(rpCode);
    return getDocs({ namespace, ...args });
};

const putDocForRp = async ({ rpCode, ...args }) => {
    const namespace = await getRpNamespace(rpCode);
    return putDoc({ namespace, ...args });
};

module.exports = ({
    async close() {
        try {
            await orm.destroy();
        } catch (err) {
            // meh
        }
    },

    async getRoomMeta(rpCode) {
        return (await getDocsForRp({ rpCode, where: { doc_id: 'meta' } }))[0].body;
    },

    async getRoomCharas(rpCode) {
        return getDocsForRp({ rpCode, prefix: 'chara' });
    },

    async getRoomMessageCount(rpCode) {
        const db = await connection;
        const roomId = await getRoomId(rpCode);
        return db.collection('messages').count({ roomId });
    },

    async getRoomMessagesLatest(rpCode, latestNum) {
        const db = await connection;
        const roomId = await getRoomId(rpCode);
        return (
            await db.collection('messages')
                .find({ roomId }, { roomId: 0 })
                .sort({ _id: -1 })
                .limit(latestNum)
                .toArray()
        ).reverse();
    },

    async getRoomMessagesSkipLimit(rpCode, skip, limit) {
        const db = await connection;
        const roomId = await getRoomId(rpCode);
        return db.collection('messages').find({ roomId }, { roomId: 0 })
            .skip(skip)
            .limit(limit)
            .toArray();
    },

    async getRoomMessagesStream(rpCode) {
        const db = await connection;
        const roomId = await getRoomId(rpCode);
        return db.collection('messages').find({ roomId }, { roomId: 0 }).stream();
    },

    async addRoom(rpCode, roomOptions) {
        await connected;
        await orm.raw(`
            INSERT INTO docs (id, parent_id, type) VALUES ('${rpCode}', NULL, 'room')
        `);
        await orm.raw(`
            INSERT INTO revs (doc_id, ip, body) VALUES ('${rpCode}', '0.0.0.0', ${JSON.stringify(JSON.stringify())})
        `);
        const db = await connection;
        const { insertedId } = await db.collection('rooms').insertOne(roomOptions);
        await db.collection('rpCodes').insertOne({ _id: rpCode, roomId: insertedId });
    },

    async addMessage(rpCode, msg) {
        const db = await connection;
        const { roomId } = (await db.collection('rpCodes').findOne({ _id: rpCode }));
        const { insertedId } = await db.collection('messages').insertOne({ roomId, ...msg });
        return insertedId;
    },

    async addChara(rpCode, chara) {
        const db = await connection;
        const { roomId } = (await db.collection('rpCodes').findOne({ _id: rpCode }));
        const { insertedId } = await db.collection('charas').insertOne({ roomId, ...chara });
        return insertedId;
    },

    async charaExists(rpCode, _id) {
        const db = await connection;
        const { roomId } = (await db.collection('rpCodes').findOne({ _id: rpCode }));
        return !!(await db.collection('charas').findOne({ roomId, _id: new ObjectID(_id) }));
    },

    async getMessage(rpCode, _id) {
        const db = await connection;
        const { roomId } = (await db.collection('rpCodes').findOne({ _id: rpCode }));
        return db.collection('messages').findOne({ roomId, _id: new ObjectID(_id) }, { roomId: 0 });
    },

    async getChara(rpCode, _id) {
        const db = await connection;
        const { roomId } = (await db.collection('rpCodes').findOne({ _id: rpCode }));
        return db.collection('charas').findOne({ roomId, _id: new ObjectID(_id) }, { roomId: 0 });
    },

    async editMessage(rpCode, _id, { content, edited }) {
        const db = await connection;
        const { roomId } = (await db.collection('rpCodes').findOne({ _id: rpCode }));
        await db.collection('messages').updateOne({ roomId, _id: new ObjectID(_id) }, { $set: { content, edited } });
    },

    async editChara(rpCode, _id, { name, color, edited }) {
        const db = await connection;
        const { roomId } = (await db.collection('rpCodes').findOne({ _id: rpCode }));
        await db.collection('charas').updateOne({ roomId, _id: new ObjectID(_id) }, { $set: { name, color, edited } });
    },

});
