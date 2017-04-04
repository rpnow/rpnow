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

module.exports = function socketConnection(socket) {
    let currentRp;
    let currentRpCode;
    let ip = config.get('trustProxy')
        && socket.handshake.headers['x-forwarded-for']
        || socket.request.connection.remoteAddress;
    let ipid = crypto.createHash('md5')
        .update(ip)
        .digest('hex')
        .substr(0,18);

    socket.use((packet, next) => {
        let packetType = packet[0];
        let packetContent = packet[1];
        logger.info(
            `RECV (${ip}):`,
            currentRp ? `${currentRpCode}/"${packetType}"` : `"${packetType}"`,
             packetContent
        );
        return next();
    });

    socket.on('enter rp', (rpCode, callback) => {
        callback = safecall(callback);
        if (currentRp) return callback({code: 'IN_RP'});

        model.getRp(rpCode, (err, data) => {
            if (err) return callback(err);

            currentRp = data.id;
            currentRpCode = rpCode;
            socket.join(currentRp);
            callback(null, data.rp);
        });
    });

    socket.on('exit rp', (_unused, callback) => {
        callback = safecall(callback);
        if (!currentRp) return callback({code: 'NOT_IN_RP'});

        socket.leave(currentRp);
        currentRp = null;
        callback(null);
    });
    
    socket.on('add message', (msg, callback) => {
        callback = safecall(callback);
        if (!currentRp) return callback({code: 'NOT_IN_RP'});

        model.addMessage(currentRp, msg, ipid, (err, data) => {
            if (err) return callback(err);

            let msgWithSecret = JSON.parse(JSON.stringify(data.msg));
            msgWithSecret.secret = data.secret;

            callback(null, msgWithSecret);
            socket.to(currentRp).broadcast.emit('add message', data.msg);
        });
    });

    socket.on('edit message', (editInfo, callback) => {
        callback = safecall(callback);
        if (!currentRp) return callback({code: 'NOT_IN_RP'});
            
        model.editMessage(currentRp, editInfo, ipid, (err, data) => {
            if (err) return callback(err);

            socket.to(currentRp).broadcast.emit('edit message', {id: editInfo.id, msg: data.msg });
            data.msg.secret = editInfo.secret;
            callback(null, data.msg);
        });
    })

    socket.on('add image', (url, callback) => {
        callback = safecall(callback);
        if (!currentRp) return callback({code: 'NOT_IN_RP'});
        
        model.addImage(currentRp, url, ipid, (err, data) => {
            if (err) return callback(err);

            callback(null, data.msg);
            socket.to(currentRp).broadcast.emit('add message', data.msg);
        });
    })

    socket.on('add character', (chara, callback) => {
        callback = safecall(callback);
        if (!currentRp) return callback({code: 'NOT_IN_RP'});
        
        model.addChara(currentRp, chara, ipid, (err, data) => {
            if (err) return callback(err);

            callback(null, data.chara);
            socket.to(currentRp).broadcast.emit('add character', data.chara);
        })
    });
};
