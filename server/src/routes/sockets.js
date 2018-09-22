const { Server } = require('ws');
const model = require('../model');
const logger = require('../services/logger');
const config = require('../config');
const { subscribe } = require('../services/events');

function onConnection(socket) {
    const ip =
        (config.get('trustProxy') && socket.upgradeReq.headers['x-forwarded-for'])
        || socket.upgradeReq.connection.remoteAddress;

    const rpCode = /rpCode=([-a-zA-Z0-9]+)/g.exec(socket.upgradeReq.url)[1];

    const send = (type, data) => socket.send(JSON.stringify({ type, data }));

    model.getLatest(rpCode).then((data) => {
        logger.info(`JOIN (${ip}): ${rpCode}`);
        send('load rp', data);
    }).catch((err) => {
        logger.info(`JERR (${ip}): ${rpCode} ${(err && err.code) || err}`);
        send('rp error', err);
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
