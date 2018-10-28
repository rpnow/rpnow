const EventEmitter = require('events');

const e = new EventEmitter();

module.exports = {
    publish(channel, data) {
        e.emit(channel, JSON.stringify(data));
    },
    subscribe(channel, callback) {
        const listener = data => callback(JSON.parse(data));

        e.addListener(channel, listener);

        return e.removeListener.bind(e, channel, listener);
    },
    close() {
        e.removeAllListeners();
        return Promise.resolve();
    },
};
