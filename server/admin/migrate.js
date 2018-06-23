const { MongoClient } = require('mongodb');
const config = require('../src/config');

async function run() {
    const url = `mongodb://${config.get('DB_HOST')}/rpnow`;
    const db = await MongoClient.connect(url);
}

run();
