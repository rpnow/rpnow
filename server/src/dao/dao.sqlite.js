const Knex = require('knex');
// const errors = require('../errors');

const knex = Knex({
    client: 'sqlite3',
    connection: {
        filename: 'data.sqlite3',
    },
    // connection: ':memory:',
});

const connected = (async function connect() {
    if (!(await knex.schema.hasTable('docs'))) {
        await knex.schema.createTable('docs', (t) => {
            t.increments('event_id').primary();
            t.string('namespace').notNullable();
            t.string('collection').notNullable();
            t.string('doc_id', 64).notNullable();
            t.integer('revision').notNullable();
            t.integer('revision_age').defaultTo(0).notNullable();
            t.json('body', 50000).nullable();
            t.timestamp('timestamp').defaultTo(knex.fn.now()).notNullable();
            t.string('ip', 47).nullable();
            t.string('auth_hash').nullable();

            t.unique(['namespace', 'collection', 'revision_age', 'doc_id']);
            t.unique(['namespace', 'collection', 'doc_id', 'revision']);
            t.index('timestamp');
            t.index('ip');
            t.index('auth_hash');
        });
    }
}());

const formatQueryResult = (x) => {
    const { body, ...meta } = x;
    return { ...JSON.parse(body), ...meta };
};

const Docs = {
    async create(namespace, collection, doc_id, body, ip) {
        // TODO return entire created doc
        return knex('docs').insert({ namespace, collection, doc_id, ip, revision: 0, revision_age: 0, body: JSON.stringify(body) });
    },

    async update(namespace, collection, doc_id, body, ip) {
        if(!(await this.exists(namespace, collection, doc_id))) {
            throw new Error(`Document ${collection}:${doc_id} does not exist`);
        }
        return this.put(namespace, collection, doc_id, body, ip);
    },

    async put(namespace, collection, doc_id, body, ip) {
        await connected;
        return knex.transaction(async (tx) => {
            await tx('docs').where({ namespace, collection, doc_id }).increment('revision_age');
            const revision = tx('docs').where({ namespace, collection, doc_id }).max('revision_age');
            await tx('docs').insert({ namespace, collection, doc_id, ip, revision, revision_age: 0, body: JSON.stringify(body) });
        });
        // TODO return entire updated doc
    },

    async exists(namespace, collection, doc_id) {
        return (await this.doc(namespace, collection, doc_id)) != null;
    },

    async doc(namespace, collection, doc_id) {
        const x = await knex('docs').where({ namespace, collection, doc_id, revision_age: 0 }).first();
        return formatQueryResult(x);
    },

    docs(namespace, collection, filters) {
        let q = knex('docs').where({ namespace, revision_age: 0 })

        if (collection != null) {
            q = q.where({ collection });
        }
        if (filters.since != null) {
            q = q.where('event_id', '>', filters.since);
        }
        if (filters.skip >= 0) {
            q = q.offset(filters.skip)
        }
        if (filters.limit >= 0) {
            q = q.limit(filters.limit);
        }

        q = q
            .orderBy('namespace', 'asc')
            .orderBy('collection', 'asc')
            .orderBy('doc_id', filters.reverse ? 'desc' : 'asc')
            .orderBy('revision', 'asc')
        
        return {
            async asArray() {
                await connected;
                const res = await q;
                return res.map(formatQueryResult);
            },
            async asMap() {
                await connected;
                const res = await q;
                return res.map(formatQueryResult)
                    .reduce((map, x) => map.set(x.doc_id, x), new Map());
            },
            async count() {
                await connected;
                return q.count();
            },
            async asStream() {
                // TODO
            }
        };
    },

    async lastEventId() {
        return (await knex('docs').max('event_id AS value').first()).value;
    },

    async transaction(callback) {
        // TODO
    },
}

module.exports = ({
    Docs,

    async close() {
        try {
            await knex.destroy();
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
        await knex.raw(`
            INSERT INTO docs (id, parent_id, type) VALUES ('${rpCode}', NULL, 'room')
        `);
        await knex.raw(`
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
