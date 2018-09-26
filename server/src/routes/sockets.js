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
        logger.info(`JERR (${ip}): ${rpCode} - ${error.code || error}`);
        if (error.code === 'RP_NOT_FOUND') {
            socket.close(4404, error.code);
        } else {
            socket.close(4500, `${error.code || error}`);
        }
    });

    const unsub = subscribe(rpCode, send);

    let alive = true;
    setInterval(() => {
        if (socket.readyState === 2 || socket.readyState === 3) {
            // socket is closing or closed. no pinging
        } else if (alive) {
            alive = false;
            socket.ping();
        } else {
            logger.info(`DIED (${ip}): ${rpCode}`);
            socket.terminate();
        }
    }, 3000);
    socket.on('pong', () => {
        logger.debug(`PONG (${ip}): ${rpCode}`);
        alive = true;
    });

    socket.on('close', (code, reason) => {
        logger.info(`EXIT (${ip}): ${rpCode} - ${code} ${reason}`);
        unsub();
    });
}

module.exports = function createSocketListener(httpServer) {
    const wss = new Server({ server: httpServer });

    setInterval(() => {
        logger.debug(`Connected clients: ${wss.clients.size}`);
    }, 3 * 1000);
    setInterval(() => {
        logger.info(`Connected clients: ${wss.clients.size}`);
    }, 5 * 60 * 1000);

    wss.on('connection', onConnection);

    process.on('SIGINT', () => {
        // force close
        wss.close();
    });
};
