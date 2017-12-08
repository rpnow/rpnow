const MongoClient = require('mongodb').MongoClient
const config = require('./config');

async function connect() {
    let url = `mongodb://${config.get('DB_HOST')}/rpnow`;
    let db = await MongoClient.connect(url);
    return db.collection('rooms');
}

module.exports.getRoomByCode = async function(rpCode) {
    let db = await connect();
    let rp = await db.findOne({ rpCode });

    if (!rp) return null;

    let data = { rp, id: rp._id };
    delete data.rp._id;
    delete data.rp.rpCode;
    return data;
}

module.exports.addRoom = async function(rpCode, {title, desc}) {
    let room = { rpCode, title, desc, msgs: [], charas: [] }
    if (room.desc === undefined) delete room.desc;

    let db = await connect();
    await db.insert(room);
}

module.exports.addMessage = async function(rpid, msg) {
    let db = await connect();
    await db.update({ _id: rpid }, {$push: {msgs: msg}});
}

module.exports.addChara = async function(rpid, chara) {
    let db = await connect();
    await db.update({ _id: rpid }, {$push: {charas: chara}});
}

module.exports.charaExists = async function(rpid, idx) {
    let db = await connect();
    let rp = await db.findOne({ _id: rpid }, { charas: 1 });

    return idx < rp.charas.length;
}

module.exports.getMessage = async function(rpid, idx) {
    let db = await connect();
    let rp = await db.findOne({ _id: rpid }, { _id: 0, msgs: {$slice:[idx,1]} });

    return rp.msgs[0] || null;
}

module.exports.editMessage = async function(rpid, idx, {content, edited}) {
    let db = await connect();
    await db.update({ _id: rpid }, { $set: { [`msgs.${idx}.content`]: content, [`msgs.${idx}.edited`]: edited }});
}