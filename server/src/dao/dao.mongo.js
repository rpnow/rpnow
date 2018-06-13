const { MongoClient, ObjectID } = require('mongodb');
const config = require('../config');

const url = `mongodb://${config.get('DB_HOST')}`;
const connection = MongoClient.connect(url).catch(() => {
    console.error('Could not connect to mongodb');
    process.exit(1);
});
process.on('SIGINT', () => {
    // force close
    connection.then(conn => conn.close(true));
});

module.exports = ({

    async getRoomByCode(rpCode) {
        const db = (await connection).db(rpCode);

        const rp = {
            ...(await db.collection('meta').findOne({ _id: 'meta' }, { _id: 0 })),
            msgs: await db.collection('messages').find({}).toArray(),
            charas: await db.collection('charas').find({}).toArray(),
        };

        if (!rp.title) return null;

        return { rp };
    },

    async addRoom(rpCode, roomOptions) {
        const db = (await connection).db(rpCode);
        await db.collection('meta').insertOne({ _id: 'meta', ...roomOptions });
    },

    async addMessage(rpCode, msg) {
        const db = (await connection).db(rpCode);
        await db.collection('messages').insertOne(msg);
    },

    async addChara(rpCode, chara) {
        const db = (await connection).db(rpCode);
        await db.collection('charas').insertOne(chara);
    },

    async charaExists(rpCode, _id) {
        const db = (await connection).db(rpCode);
        return !!(await db.collection('charas').findOne({ _id: new ObjectID(_id) }));
    },

    async getMessage(rpCode, _id) {
        const db = (await connection).db(rpCode);
        return db.collection('messages').findOne({ _id: new ObjectID(_id) });
    },

    async editMessage(rpCode, _id, { content, edited }) {
        const db = (await connection).db(rpCode);
        await db.collection('messages').updateOne({ _id }, { content, edited });
    },

});
