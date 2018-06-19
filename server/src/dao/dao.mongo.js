const { MongoClient } = require('mongodb');
const config = require('../config');

const url = `mongodb://${config.get('DB_HOST')}/rpnow`;
const mongoConnection = MongoClient.connect(url);
const rooms = mongoConnection.then(db => db.collection('rooms'));

process.on('SIGINT', () => {
    // force close
    mongoConnection.then(conn => conn.close(true));
});

module.exports = ({
    async getRoomByCode(rpCode) {
        const db = await rooms;
        const rp = await db.findOne({ rpCode }, { _id: 0, rpCode: 0 });

        if (!rp) return null;

        return { rp };
    },

    async addRoom(rpCode, { title, desc }) {
        const room = {
            rpCode, title, desc, msgs: [], charas: [],
        };
        if (room.desc === undefined) delete room.desc;

        const db = await rooms;
        await db.insert(room);
    },

    async addMessage(rpCode, msg) {
        const db = await rooms;
        await db.update({ rpCode }, { $push: { msgs: msg } });
    },

    async addChara(rpCode, chara) {
        const db = await rooms;
        await db.update({ rpCode }, { $push: { charas: chara } });
    },

    async charaExists(rpCode, idx) {
        const db = await rooms;
        const rp = await db.findOne({ rpCode }, { charas: 1 });

        return idx < rp.charas.length;
    },

    async getMessage(rpCode, idx) {
        const db = await rooms;
        const rp = await db.findOne({ rpCode }, { _id: 0, msgs: { $slice: [idx, 1] } });

        return rp.msgs[0] || null;
    },

    async editMessage(rpCode, idx, { content, edited }) {
        const db = await rooms;
        await db.update({ rpCode }, { $set: { [`msgs.${idx}.content`]: content, [`msgs.${idx}.edited`]: edited } });
    },

});
