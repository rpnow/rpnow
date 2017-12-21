const crypto = require('crypto');
const socketio = require('socket.io');

const model = require('./model');
const logger = require('./logger');
const config = require('./config');
const noop = (function(){});

const safecall = function(callback) {
    if (typeof callback !== 'function') return noop;
    return function() {
        try {
            callback.apply(callback, arguments);
        }
        catch(ex) {}
    }
};

module.exports = function(httpServer) {
    const io = socketio(httpServer, { serveClient: false })

    io.on('connection', socket => onConnection(socket, io));

    listenToModelEvents(io);
}

function onConnection(socket, io) {
    const ip = config.get('trustProxy')
        && socket.handshake.headers['x-forwarded-for']
        || socket.request.connection.remoteAddress;
    const ipid = crypto.createHash('md5')
        .update(ip)
        .digest('hex')
        .substr(0,18);

    const rpCode = socket.handshake.query.rpCode;

    let rpid;
    const rpInit = model.getRp(rpCode).then(data => {
        rpid = data.id;
        socket.join(rpid);
        socket.emit('load rp', data.rp);
    }).catch(err => {
        socket.emit('rp error', err);
        socket.disconnect();
    });

    socket.use((packet, next) => {
        // stall action packets until the rp has been loaded and sent
        rpInit
            .then(()=>next())
            .catch(err=>next(err));
    });

    socket.use((packet, next) => {
        // logging
        let packetType = packet[0];
        let packetContent = JSON.stringify(packet[1]);
        logger.info(`RECV (${ip}): ${rpCode}/"${packetType}" ${packetContent}`);
        next();
    });

    socket.use((packet, next) => {
        // sanitize callback function
        let cb = safecall(packet[2]);

        // give promise resolve/reject functions to the socket.on calls
        packet[2] = (promise) => promise
            .then(data => cb(null, data))
            .catch(err => {
                logger.error(`ERR! (${ip}): ${rpCode}/"${packet[0]}" ${err}`);
                cb(err)
            })
        
        next();
    })
    
    socket.on('add message', (msg, doPromise) => {
        doPromise(model.addMessage(rpid, msg, ipid));
    });

    socket.on('edit message', (editInfo, doPromise) => {
        doPromise(model.editMessage(rpid, editInfo, ipid));
    });

    socket.on('add image', (url, doPromise) => {
        doPromise(model.addImage(rpid, url, ipid));
    })

    socket.on('add character', (chara, doPromise) => {
        doPromise(model.addChara(rpid, chara, ipid));
    });
};

function listenToModelEvents(io) {
    model.events.on('add message', (rpid, msg) => {
        io.to(rpid).emit('add message', msg);
    });

    model.events.on('edit message', (rpid, msg, id) => {
        io.to(rpid).emit('edit message', { id, msg });
    });

    model.events.on('add character', (rpid, chara) => {
        io.to(rpid).emit('add character', chara);
    });
}
