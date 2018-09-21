const socketio = require('socket.io');

const model = require('../model');
const logger = require('../services/logger');
const config = require('../config');

function onConnection(socket) {
    const ip =
        (config.get('trustProxy') && socket.handshake.headers['x-forwarded-for'])
        || socket.request.connection.remoteAddress;

    const { rpCode } = socket.handshake.query;

    model.getLatest(rpCode).then((data) => {
        socket.join(rpCode);
        logger.info(`JOIN (${ip}): ${rpCode} - connection id ${socket.id}`);
        socket.emit('load rp', data);
    }).catch((err) => {
        logger.info(`JERR (${ip}): ${rpCode} ${(err && err.code) || err}`);
        socket.emit('rp error', err);
        socket.disconnect();
    });

    socket.on('disconnect', () => {
        logger.info(`EXIT (${ip}): ${rpCode} - connection id ${socket.id}`);
    });
}

function listenToModelEvents(io) {
    model.events.on('add message', (rpCode, msg) => {
        io.to(rpCode).emit('add message', msg);
    });

    model.events.on('edit message', (rpCode, msg) => {
        io.to(rpCode).emit('edit message', msg);
    });

    model.events.on('add character', (rpCode, chara) => {
        io.to(rpCode).emit('add character', chara);
    });
}

module.exports = function createSocketApi(httpServer) {
    const io = socketio(httpServer, { serveClient: false });

    io.on('connection', socket => onConnection(socket));

    listenToModelEvents(io);

    process.on('SIGINT', () => {
        // force close
        io.close();
    });
};
