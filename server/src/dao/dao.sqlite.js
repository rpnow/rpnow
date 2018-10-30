const knex = require('knex');
// const errors = require('../errors');

const orm = knex({
    client: 'sqlite3',
    connection: {
        filename: 'data.sqlite3',
    },
});

const connected = (async function connect() {
    if (!(await orm.schema.hasTable('docs'))) {
        await orm.schema.createTable('docs', (t) => {
            t.string('id', 36).primary().notNullable();
            t.string('parent_id', 36).nullable();
            t.string('type').notNullable();

            t.foreign('parent_id').references('docs.id');
            t.index('parent_id');
            t.index('type');
        });
    }
    if (!(await orm.schema.hasTable('revs'))) {
        await orm.schema.createTable('revs', (t) => {
            t.string('doc_id', 36).nullable();
            t.timestamp('timestamp').defaultTo(orm.fn.now()).notNullable();
            t.string('ip', 47).nullable();
            t.string('body', 20000).notNullable();
            t.increments('event_index').primary().notNullable();

            t.foreign('doc_id').references('docs.id');
            t.index('doc_id');
            t.index('timestamp');
            t.index('ip');
        });
    }
}());

module.exports = ({
    async close() {
        try {
            await orm.destroy();
        } catch (err) {
            // meh
        }
    },

    async getRoomMeta(rpCode) {
        await connected;
        return orm.raw(`
            SELECT roomsRev.body
            FROM docs AS rooms
            JOIN revs AS roomsRev ON (roomsRev.doc_id = rooms.id)
            WHERE rooms.type = 'room'
            AND rooms.id = '${rpCode}'
        `);
    },

    async getRoomCharas(rpCode) {
        const db = await connection;
        const roomId = await getRoomId(rpCode);
        return db.collection('charas').find({ roomId }, { roomId: 0 }).toArray();
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
