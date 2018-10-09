const redis = require('redis');
const config = require('../config');
const { promisify } = require('util');

const pubClient = redis.createClient(`redis://${config.get('redisHost')}`);
const pub = promisify(pubClient.publish).bind(pubClient);

const subClients = new Set();

module.exports = {
    publish(channel, data) {
        return pub(channel, JSON.stringify(data));
    },
    subscribe(channel, listener) {
        const subClient = redis.createClient(`redis://${config.get('redisHost')}`);
        subClients.add(subClient);

        subClient.on('message', (_channel, data) => listener(JSON.parse(data)));
        subClient.subscribe(channel);

        return () => {
            subClients.delete(subClient);
            subClient.quit();
        };
    },
    close() {
        const promises = [pubClient, ...subClients]
            .map(client => new Promise(resolve => client.quit(resolve)));
        return Promise.all(promises);
    },
};
