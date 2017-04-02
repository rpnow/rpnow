const http = require('http');
const socketio = require('socket.io');
const crypto = require('crypto');
const rpnow = require('./constants');
const model = require('./model');
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

let listener;

module.exports.logging = true;
module.exports.trustProxy = false;

module.exports.start = function(callback = noop) {
    if (listener) return callback('Server already started.');

    let server = http.createServer();
    let io = socketio(server, { serveClient: false });
    io.on('connection', clientHandler);

    listener = server.listen(rpnow.port, (err)=>{
        callback(err || null);
    });
}

module.exports.stop = function(callback = noop) {
    if (!listener) return callback('No server to stop.');

    listener.close((err) => { 
        if (err) return callback(err);
        listener = null;
        callback(null);
    });
}

function clientHandler(socket) {
    let currentRp;
    let currentRpCode;
    let ip = module.exports.trustProxy
        && socket.handshake.headers['x-forwarded-for']
        || socket.request.connection.remoteAddress;
    let ipid = crypto.createHash('md5')
        .update(ip)
        .digest('hex')
        .substr(0,18);

    if (module.exports.logging) socket.use((packet, next) => {
        let packetType = packet[0];
        let packetContent = packet[1];
        console.log(
            `RECV (${ip}):`,
            currentRp ? `${currentRpCode}/"${packetType}"` : `"${packetType}"`,
             packetContent
        );
        return next();
    });

    socket.on('create rp', (room, callback) => {
        callback = safecall(callback);
        model.createRp(room, callback);
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
}
