const { MongoClient, ObjectID } = require('mongodb');
const config = require('../config');

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

    if (rpCodeData == null) throw new Error(`Room not found ${rpCode}`);
    return rpCodeData.roomId;
}

async function roomExists(rpCode) {
    try {
        await getRoomId(rpCode);
        return true;
    } catch (ex) {
        return false;
    }
}

async function getRoomMeta(rpCode) {
    const db = await connection;
    const roomId = await getRoomId(rpCode);
    return db.collection('rooms').findOne({ _id: roomId }, { _id: 0 });
}

async function getRoomCharas(rpCode) {
    const db = await connection;
    const roomId = await getRoomId(rpCode);
    return db.collection('charas').find({ roomId }, { roomId: 0 }).toArray();
}

async function getRoomMessageCount(rpCode) {
    const db = await connection;
    const roomId = await getRoomId(rpCode);
    return db.collection('messages').count({ roomId });
}

async function getRoomMessagesLatest(rpCode, latestNum) {
    const db = await connection;
    const roomId = await getRoomId(rpCode);
    return (
        await db.collection('messages')
            .find({ roomId }, { roomId: 0 })
            .sort({ _id: -1 })
            .limit(latestNum)
            .toArray()
    ).reverse();
}

async function getRoomMessagesSkipLimit(rpCode, skip, limit) {
    const db = await connection;
    const roomId = await getRoomId(rpCode);
    return db.collection('messages').find({ roomId }, { roomId: 0 })
        .skip(skip)
        .limit(limit)
        .toArray();
}

async function getRoomMessagesAll(rpCode) {
    const db = await connection;
    const roomId = await getRoomId(rpCode);
    return db.collection('messages').find({ roomId }, { roomId: 0 }).toArray();
}

module.exports = ({
    roomExists,

    async getRoomByCode(rpCode) {
        const [meta, msgs, charas] = await Promise.all([
            getRoomMeta(rpCode),
            getRoomMessagesAll(rpCode),
            getRoomCharas(rpCode),
        ]);
        return { ...meta, msgs, charas };
    },

    async getPage(rpCode, skip, limit) {
        const [meta, msgs, charas, msgCount] = await Promise.all([
            getRoomMeta(rpCode),
            getRoomMessagesSkipLimit(rpCode, skip, limit),
            getRoomCharas(rpCode),
            getRoomMessageCount(rpCode),
        ]);
        return { ...meta, msgs, charas, msgCount };
    },

    async getLatest(rpCode, msgCount) {
        const [meta, msgs, charas] = await Promise.all([
            getRoomMeta(rpCode),
            getRoomMessagesLatest(rpCode, msgCount),
            getRoomCharas(rpCode),
        ]);
        return { ...meta, msgs, charas };
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
