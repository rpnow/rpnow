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

module.exports = ({

    async roomExists(rpCode) {
        const db = await connection;
        const rpCodeData = (await db.collection('rpCodes').findOne({ _id: rpCode }));

        return rpCodeData != null;
    },

    async getRoomByCode(rpCode) {
        const db = await connection;
        const rpCodeData = (await db.collection('rpCodes').findOne({ _id: rpCode }));

        if (!rpCodeData) return null;

        const { roomId } = rpCodeData;

        const rp = {
            ...(await db.collection('rooms').findOne({ _id: roomId }, { _id: 0 })),
            msgs: await db.collection('messages').find({ roomId }, { roomId: 0 }).toArray(),
            charas: await db.collection('charas').find({ roomId }, { roomId: 0 }).toArray(),
        };

        return { rp };
    },

    async getPage(rpCode, skip, limit) {
        const db = await connection;
        const rpCodeData = (await db.collection('rpCodes').findOne({ _id: rpCode }));

        if (!rpCodeData) return null;

        const { roomId } = rpCodeData;

        return {
            ...(await db.collection('rooms')
                .findOne({ _id: roomId }, { _id: 0 })),
            msgs: await db.collection('messages')
                .find({ roomId }, { roomId: 0 })
                .skip(skip)
                .limit(limit)
                .toArray(),
            charas: await db.collection('charas')
                .find({ roomId }, { roomId: 0 })
                .toArray(),
            msgCount: await db.collection('messages')
                .count({ roomId }),
        };
    },

    async getLatest(rpCode, msgCount) {
        const db = await connection;
        const rpCodeData = (await db.collection('rpCodes').findOne({ _id: rpCode }));

        if (!rpCodeData) return null;

        const { roomId } = rpCodeData;

        return {
            ...(await db.collection('rooms')
                .findOne({ _id: roomId }, { _id: 0 })),
            msgs: (await db.collection('messages')
                .find({ roomId }, { roomId: 0 })
                .sort({ _id: -1 })
                .limit(msgCount)
                .toArray())
                .reverse(),
            charas: await db.collection('charas')
                .find({ roomId }, { roomId: 0 })
                .toArray(),
        };
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

    async editMessage(rpCode, _id, { content, edited }) {
        const db = await connection;
        const { roomId } = (await db.collection('rpCodes').findOne({ _id: rpCode }));
        await db.collection('messages').updateOne({ roomId, _id: new ObjectID(_id) }, { $set: { content, edited } });
    },

});
