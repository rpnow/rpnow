const socketio = require('socket.io');

const model = require('../model');
const logger = require('../services/logger');
const config = require('../config');
const { subscribe } = require('../services/events');

function onConnection(socket) {
    const ip =
        (config.get('trustProxy') && socket.handshake.headers['x-forwarded-for'])
        || socket.request.connection.remoteAddress;

    const { rpCode } = socket.handshake.query;

    model.getLatest(rpCode).then((data) => {
        logger.info(`JOIN (${ip}): ${rpCode} - connection id ${socket.id}`);
        const payload = { type: 'load rp', data };
        socket.send(JSON.stringify(payload));
    }).catch((err) => {
        logger.info(`JERR (${ip}): ${rpCode} ${(err && err.code) || err}`);
        const payload = { type: 'rp error', data: err };
        socket.send(JSON.stringify(payload));
        socket.disconnect();
    });

    const unsub = subscribe(rpCode, (type, data) => {
        const payload = { type, data };
        socket.send(JSON.stringify(payload));
    });

    socket.on('disconnect', () => {
        logger.info(`EXIT (${ip}): ${rpCode} - connection id ${socket.id}`);
        unsub();
    });
}

module.exports = function createSocketListener(httpServer) {
    const io = socketio(httpServer, { serveClient: false, transports: ['websocket'] });

    io.on('connection', socket => onConnection(socket));

    process.on('SIGINT', () => {
        // force close
        io.close();
    });
};
