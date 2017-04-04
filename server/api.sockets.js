const crypto = require('crypto');

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

module.exports = function onConnection(socket) {
    let ip = config.get('trustProxy')
        && socket.handshake.headers['x-forwarded-for']
        || socket.request.connection.remoteAddress;
    let ipid = crypto.createHash('md5')
        .update(ip)
        .digest('hex')
        .substr(0,18);

    let rpCode = socket.handshake.query.rpCode;
    let rpid;

    let rpInit = new Promise((resolve, reject) => {
        model.getRp(rpCode, (err, data) => {
            if (err) return reject(err);

            rpid = data.id;
            socket.join(rpid);
            socket.emit('load rp', data.rp);
            return resolve(data);
        });
    }).catch(err => socket.emit('rp error', err));

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
        packet[2] = safecall(packet[2]);
        next();
    })
    
    socket.on('add message', (msg, callback) => {
        model.addMessage(rpid, msg, ipid, (err, data) => {
            if (err) return callback(err);

            let msgWithSecret = JSON.parse(JSON.stringify(data.msg));
            msgWithSecret.secret = data.secret;

            callback(null, msgWithSecret);
            socket.to(rpid).broadcast.emit('add message', data.msg);
        });
    });

    socket.on('edit message', (editInfo, callback) => {
        model.editMessage(rpid, editInfo, ipid, (err, data) => {
            if (err) return callback(err);

            socket.to(rpid).broadcast.emit('edit message', {id: editInfo.id, msg: data.msg });
            data.msg.secret = editInfo.secret;
            callback(null, data.msg);
        });
    })

    socket.on('add image', (url, callback) => {
        model.addImage(rpid, url, ipid, (err, data) => {
            if (err) return callback(err);

            callback(null, data.msg);
            socket.to(rpid).broadcast.emit('add message', data.msg);
        });
    })

    socket.on('add character', (chara, callback) => {
        model.addChara(rpid, chara, ipid, (err, data) => {
            if (err) return callback(err);

            callback(null, data.chara);
            socket.to(rpid).broadcast.emit('add character', data.chara);
        })
    });
};
