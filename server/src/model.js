const request = require('request');
const crypto = require('crypto');
const mongojs = require('mongojs');
const nJ = require('normalize-json');
const config = require('./config');

const db = mongojs(`${config.get('DB_HOST')}/rpnow`, ['rooms']);

const roomOptionsSchema = nJ({
    'title': [ String, config.get('maxTitleLength') ],
    'desc': [ {$optional:String}, config.get('maxDescLength') ]
});
const addCharaSchema = nJ({
    'name': [ String, config.get('maxCharaNameLength') ],
    'color': /^#[0-9a-f]{6}$/g
});
const addMessageSchema = nJ({
    'content': [ String, config.get('maxMessageContentLength') ],
    'type': [ 'narrator', 'chara', 'ooc' ],
    'charaId': (msg)=> msg.type === 'chara' ? [ Number, 0, Infinity ] : undefined,
    'challenge': [ String, 128 ]
});
const editMessageSchema = nJ({
    'id': [ Number, 0, Infinity ],
    'content': [ String, config.get('maxMessageContentLength') ],
    'secret': [ String, 64 ]
});

function generateRpCode(callback) {
    let length = config.get('rpCodeLength');
    let characters = config.get('rpCodeChars');

    let numCryptoBytes = length * 2; // ample bytes just in case
    crypto.randomBytes(numCryptoBytes, gotBytes);

    function gotBytes(err, buffer) {
        if (err) return callback(err);

        let token = buffer.toString('base64');
        let rpCode = token.match(new RegExp(characters.split('').join('|'), 'g')).join('').substr(0, length);
        
        // if it generated a bad rp code, try again
        if (rpCode.length !== length) {
            return crypto.randomBytes(numCryptoBytes, gotBytes);
        }
        // ensure code doesn't exist already
        db.rooms.findOne({ rpCode: rpCode }, (err, rp) => {
            if (err) return callback(err);
            if (rp) return crypto.randomBytes(numCryptoBytes, gotBytes);

            callback(null, rpCode);
        });
    }
}

module.exports.generateChallenge = function(callback) {
    crypto.randomBytes(32, (err, buf) => {
        if (err) return callback({ code: 'INTERNAL_ERROR', details: err });

        let secret = buf.toString('hex');
        let hash = crypto.createHash('sha512')
            .update(secret)
            .digest('hex');

        callback(null, {secret, hash});
    });
};

function isCorrectSecret(guess, hash) {
    let guessHash = crypto.createHash('sha512')
        .update(guess)
        .digest('hex');

    return guessHash === hash;
}

module.exports.createRp = function(input, callback) {
    let roomOptions;
    try {
        roomOptions = roomOptionsSchema(input);
    }
    catch (error) {
        return callback({code: 'BAD_RP', details: error.message});
    }

    generateRpCode((err, rpCode) => {
        let room = {
            rpCode: rpCode,
            title: roomOptions.title,
            desc: roomOptions.desc,
            msgs: [],
            charas: []
        }
        if (roomOptions.desc === undefined) delete room.desc;

        db.rooms.insert(room, (err, rp) => {
            if (err) return callback({ code: 'DB_ERROR', details: err.message });
            callback(null, { rpCode });
        });
    });
};

module.exports.getRp = function(rpCode, callback) {
    if (typeof rpCode !== 'string') return callback({code: 'BAD_RPCODE'});
    
    db.rooms.findOne({ rpCode: rpCode }, (err, rp) => {
        if (!rp) return callback({code: 'RP_NOT_FOUND'});
        
        let data = {
            id: rp._id,
            rp: rp
        }
        delete data.rp._id;
        delete data.rp.rpCode;
        callback(null, data);
    });
};

function pushToMsgs(rpid, msg, ipid, callback) {
    msg.timestamp = Date.now() / 1000;
    msg.ipid = ipid;

    db.rooms.update({ _id: rpid }, {$push: {msgs: msg}}, (err, r) => {
        if (err) return callback({ code: 'DB_ERROR', details: err.message });
        callback(null, { msg });
    });
}

module.exports.addMessage = function(rpid, input, ipid, callback) {
    let msg;
    try {
        msg = addMessageSchema(input);
    }
    catch (error) {
        return callback({code: 'BAD_MSG', details: error.message});
    }
    
    // store & broadcast
    if (msg.type === 'chara') {
        // charas must be in the chara list
        db.rooms.findOne({ _id: rpid }, { charas: 1 }, (err, rp) => {
            if (err) return callback({ code: 'DB_ERROR', details: err });

            if (msg.charaId >= rp.charas.length) return callback({code: 'CHARA_NOT_FOUND', details: `no character with id ${msg.charaId}`});

            pushToMsgs(rpid, msg, ipid, callback);
        });
    }
    else {
        pushToMsgs(rpid, msg, ipid, callback);
    }
};

module.exports.addImage = function(rpid, url, ipid, callback) {
    if (typeof url !== 'string') return callback({code: 'BAD_URL'});

    // validate image
    request.head(url, (err, res) => {
        if (err) return callback({ code: 'URL_FAILED', details: err });
        if (!res.headers['content-type']) return callback({ code: 'UNKNOWN_CONTENT' });
        if (!res.headers['content-type'].startsWith('image/')) return callback({code: 'BAD_CONTENT'});

        // store & broadcast
        let msg = {
            type: 'image',
            url: url
        };
        pushToMsgs(rpid, msg, ipid, callback);
    });
};

module.exports.addChara = function(rpid, inputChara, ipid, callback) {
    let chara;
    try {
        chara = addCharaSchema(inputChara);
    }
    catch (error) {
        return callback({code: 'BAD_CHARA', details: error.message});
    }

    // store & broadcast
    db.rooms.update({ _id: rpid }, {$push: {charas: chara}}, (err) => {
        if (err) return callback({ code: 'DB_ERROR', details: err });
        callback(null, { chara });
    });
};

module.exports.editMessage = function(rpid, input, ipid, callback) {
    let editInfo;
    try {
        editInfo = editMessageSchema(input);
    }
    catch (error) {
        return callback({code: 'BAD_EDIT', details: error.message});
    }

    // check if the message is there
    db.rooms.findOne({ _id: rpid }, { _id: 0, msgs: {$slice:[editInfo.id,1]} }, (err, rp) => {
        if (err) return callback({ code: 'DB_ERROR', details: err });

        if (rp.msgs.length === 0) return callback({ code: 'BAD_MSG_ID' });

        let msg = rp.msgs[0];

        if (!isCorrectSecret(editInfo.secret, msg.challenge)) return callback({ code: 'BAD_SECRET'});

        msg.content = editInfo.content;
        msg.edited = (Date.now() / 1000);
        db.rooms.update({ _id: rpid }, { $set: { [`msgs.${editInfo.id}.content`]:msg.content, [`msgs.${editInfo.id}.edited`]:msg.edited }}, (err) => {
            if (err) return callback({ code: 'DB_ERROR', details: err });
            callback(null, { msg });
        });

    });
};
