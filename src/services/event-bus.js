const EventEmitter = require('events');

const eventBus = new EventEmitter();

module.exports = {
    publish(channel, data) {
        eventBus.emit(channel, data);
    },
    subscribe(channel, callback) {
        eventBus.addListener(channel, callback);
        return eventBus.removeListener.bind(eventBus, channel, callback);
    },
};
