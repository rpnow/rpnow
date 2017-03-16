const crypto = require('crypto');
const mongojs = require('mongojs');
const normalize = require('./normalize-json');

const noop = function(){};

let newRpSchema = {
   'title': [ String, 30 ],
   'desc': [ {$optional:String}, 255 ]
};
let charaSchema = {
   'name': [ String, 30 ],
   'color': /^#[0-9a-f]{6}$/gi
};
let messageSchema = {
   'content': [ String, 10000 ],
   'type': [ 'narrator', 'chara', 'ooc' ],
   'charaId': (msg)=> msg.type === 'chara' ? [ Number, 0, Infinity ] : undefined
};

module.exports = function(options, io) {
   let db = mongojs(`${options.db}/rpnow`, ['rooms']);

   function generateRpCode(callback) {
      let length = options.rpCodeLength;
      let characters = options.rpCodeCharacters;

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
   
   io.on('connection', (socket) => {
      let currentRp;
      let ipid = crypto.createHash('md5')
         .update(socket.request.connection.remoteAddress)
         .digest('hex')
         .substr(0,18);

      socket.on('create rp', (room, callback = noop) => {
         let result = normalize(room, newRpSchema);
         if (!result.valid) return next(new Error(result.error));

         generateRpCode((err, rpCode) => {
            room.rpCode = rpCode;
            room.msgs = [];
            room.charas = [];
            db.rooms.insert(room, (err, rp) => {
               if (err) callback({ error: err });
               callback({ rpCode: rpCode });
            });
         });
      });

      socket.on('enter rp', (rpCode, callback = noop) => {
         if (currentRp) return callback({error: 'already joined an rp'});
         if (typeof rpCode !== 'string') return callback({error: 'invalid rpCode'});
         
         db.rooms.findOne({ rpCode: rpCode }, (err, rp) => {
            if (!rp) return callback({error: 'no rp found'});
            
            currentRp = rp._id;
            socket.join(currentRp);
            delete rp._id;
            callback(rp);
         });
      });

      socket.on('exit rp', (rpCode, callback = noop) => {
         if (!currentRp) return callback({error: 'not in an rp yet'});

         socket.leave(currentRp);
         currentRp = null;
         callback({});
      });
      
      socket.on('add message', (msg, callback = noop) => {
         // validate & normalize
         let result = normalize(msg, messageSchema);
         if (!result.valid) return callback({error: result.error});
         msg.timestamp = Date.now() / 1000;
         msg.ipid = ipid;
         
         // store & broadcast
         if (msg.type === 'chara') {
            // charas must be in the chara list
            db.rooms.findOne({ _id: currentRp }, { charas: 1 }, (err, rp) => {
               if (msg.charaId >= rp.charas.length) return callback({error: `no character with id ${msg.charaId}`});

               storeAndBroadcast();
            });
         }
         else {
            storeAndBroadcast();
         }
         function storeAndBroadcast() {
            db.rooms.update({ _id: currentRp }, {$push: {msgs: msg}}, (err, r) => {
                callback(msg);
                socket.to(currentRp).broadcast.emit('add message', msg);
            });
         }
      });

      socket.on('add character', (chara, callback = noop) => {
         // validate & normalize
         let result = normalize(chara, charaSchema);
         if (!result.valid) return callback({error: result.error});

         // store & broadcast
         db.rooms.update({ _id: currentRp }, {$push: {charas: chara}}, (err, r) => {
            callback(chara);
            socket.to(currentRp).broadcast.emit('add character', chara);
         });
      });
   });
};

