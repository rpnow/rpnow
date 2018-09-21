const redis = require('redis');
const config = require('../config');
const { promisify } = require('util');

const pubClient = redis.createClient(`redis://${config.get('redisHost')}`);
const pub = promisify(pubClient.publish).bind(pubClient);

process.on('SIGINT', () => pubClient.quit());

module.exports = {
    publish(channel, type, data) {
        return pub(channel, JSON.stringify({ type, data }));
    },
    subscribe(channel, listener) {
        const subClient = redis.createClient(`redis://${config.get('redisHost')}`);

        subClient.on('message', (_channel, msg) => {
            const { type, data } = JSON.parse(msg);
            listener(type, data);
        });
        subClient.subscribe(channel);

        process.on('SIGINT', () => subClient.quit());

        return () => subClient.quit();
    },
};
