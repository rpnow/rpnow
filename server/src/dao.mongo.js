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
}
