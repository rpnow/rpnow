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
        const rp = await db.findOne({ rpCode });

        if (!rp) return null;

        const data = { rp, id: rp._id };
        delete data.rp._id;
        delete data.rp.rpCode;
        return data;
    },

    async addRoom(rpCode, { title, desc }) {
        const room = {
            rpCode, title, desc, msgs: [], charas: [],
        };
        if (room.desc === undefined) delete room.desc;

        const db = await rooms;
        await db.insert(room);
    },

    async addMessage(rpid, msg) {
        const db = await rooms;
        await db.update({ _id: rpid }, { $push: { msgs: msg } });
    },

    async addChara(rpid, chara) {
        const db = await rooms;
        await db.update({ _id: rpid }, { $push: { charas: chara } });
    },

    async charaExists(rpid, idx) {
        const db = await rooms;
        const rp = await db.findOne({ _id: rpid }, { charas: 1 });

        return idx < rp.charas.length;
    },

    async getMessage(rpid, idx) {
        const db = await rooms;
        const rp = await db.findOne({ _id: rpid }, { _id: 0, msgs: { $slice: [idx, 1] } });

        return rp.msgs[0] || null;
    },

    async editMessage(rpid, idx, { content, edited }) {
        const db = await rooms;
        await db.update({ _id: rpid }, { $set: { [`msgs.${idx}.content`]: content, [`msgs.${idx}.edited`]: edited } });
    },

});
