const { Server } = require('ws');
const model = require('../model');
const logger = require('../services/logger');
const config = require('../config');
const { subscribe } = require('../services/events');

function onConnection(socket, req) {
    const ip =
        (config.get('trustProxy') && req.headers['x-forwarded-for'])
        || req.connection.remoteAddress;

    const rpCode = /rpCode=([-a-zA-Z0-9]+)/g.exec(req.url)[1];

    const send = data => socket.send(JSON.stringify(data));

    model.getLatest(rpCode).then((data) => {
        logger.info(`JOIN (${ip}): ${rpCode}`);
        send({ type: 'init', data });
    }).catch((error) => {
        logger.info(`JERR (${ip}): ${rpCode} ${(error && error.code) || error}`);
        send({ type: 'error', data: error });
        socket.disconnect();
    });

    const unsub = subscribe(rpCode, send);

    socket.on('close', () => {
        logger.info(`EXIT (${ip}): ${rpCode}`);
        unsub();
    });
}

module.exports = function createSocketListener(httpServer) {
    const wss = new Server({ server: httpServer });

    wss.on('connection', onConnection);

    process.on('SIGINT', () => {
        // force close
        wss.close();
    });
};
