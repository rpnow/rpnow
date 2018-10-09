const { MongoClient, ObjectID } = require('mongodb');
const config = require('../config');
const errors = require('../errors');

const url = `mongodb://${config.get('dbHost')}/rpnow`;
const connection = MongoClient.connect(url);
connection.catch(() => {
    console.error('Could not connect to mongodb');
    process.exit(1);
});
process.on('SIGINT', () => {
    // force close
    connection.then(db => db.close(true));
});

connection.then((db) => {
    db.collection('messages').ensureIndex('roomId');
    db.collection('charas').ensureIndex('roomId');
});

async function getRoomId(rpCode) {
    const db = await connection;
    const rpCodeData = await db.collection('rpCodes').findOne({ _id: rpCode });

    if (rpCodeData == null) throw errors.roomNotFound;
    return rpCodeData.roomId;
}

module.exports = ({
    async getRoomMeta(rpCode) {
        const db = await connection;
        const roomId = await getRoomId(rpCode);
        return db.collection('rooms').findOne({ _id: roomId }, { _id: 0 });
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
