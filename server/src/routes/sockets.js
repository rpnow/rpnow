const { Server } = require('ws');
const model = require('../model');
const logger = require('../services/logger');
const config = require('../config');
const { subscribe } = require('../services/events');

async function onConnection(socket, req) {
    const ip =
        (config.get('trustProxy') && req.headers['x-forwarded-for'])
        || req.connection.remoteAddress;

    const rpCode = (() => {
        const match = /rpCode=([-a-zA-Z0-9]+)/g.exec(req.url);
        if (!match) {
            logger.notice(`JERR (${ip}): Weird websocket url: ${req.url}`);
            return null;
        }
        return match[1];
    })();

    if (!rpCode) {
        socket.close(4400, 'Websocket URL is missing the rpCode');
        return;
    }

    const send = (data) => {
        if (socket.readyState === 1) {
            socket.send(JSON.stringify(data));
        } else {
            logger.warning(`NRDY (${ip}): ${rpCode} - tried to send data at readyState ${socket.readyState}`);
        }
    };

    try {
        const data = await model.getLatest(rpCode);

        logger.info(`JOIN (${ip}): ${rpCode}`);
        send({ type: 'init', data });
    } catch (error) {
        logger.info(`JERR (${ip}): ${rpCode} - ${error.code || error}`);
        if (error.code === 'RP_NOT_FOUND') {
            socket.close(4404, error.code);
        } else {
            socket.close(4500, `${error.code || error}`);
        }
    }

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
    }, 30000);
    socket.on('pong', () => {
        logger.debug(`PONG (${ip}): ${rpCode}`);
        alive = true;
    });

    socket.on('close', (code, reason) => {
        logger.info(`EXIT (${ip}): ${rpCode} - ${code} ${reason}`);
        unsub();
    });
}

let wss;

module.exports.createWss = function createWss(httpServer) {
    wss = new Server({ server: httpServer });

    setInterval(() => {
        logger.debug(`Connected clients: ${wss.clients.size}`);
    }, 3 * 1000);
    setInterval(() => {
        logger.info(`Connected clients: ${wss.clients.size}`);
    }, 5 * 60 * 1000);

    wss.on('connection', onConnection);
};

module.exports.closeWss = function closeWss() {
    return new Promise((resolve) => {
        wss.close(() => resolve());
    });
};
