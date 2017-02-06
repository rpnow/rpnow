/* REST calls for RPNow.
   Documentation: https://docs.google.com/spreadsheets/d/1IfC8TYu8kgqLAm1TsC1saRJsD_cxFdgz0C-YMcoYsB0
*/

const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const wordwrap = require('wordwrap');
const RateLimit = require('express-rate-limit');
const mongojs = require('mongojs');
const normalize = require('./normalize-json');

module.exports = function(options, io) {
   let router = express.Router();
   let db = mongojs(`${options.db}/rpnow`, ['rooms']);
   
   router.use(bodyParser.json());
   router.use(bodyParser.urlencoded({ extended: true }));
   if (options.rateLimit) router.use('/', new RateLimit({
      windowMs: 1000*60,
      delayAfter: (1000*60)/options.refreshMs,
      delayMs: 100,
      max: 0
   }));
   
   /*
   router.use('/rps/:rpCode.json', rpMiddleware);
   router.use('/rps/:rpCode.txt', rpMiddleware);
   router.use('/rps/:rpCode/*', rpMiddleware);
   function rpMiddleware(req, res, next) {
      req.rp = rooms[req.params.rpCode];
      if (!req.rp) return res.status(404).json({ error: 'RP not found'});
      return next();
   }
   */
   
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
      'chara': (msg)=> msg.type === 'chara' ? charaSchema : undefined
   };
   
   router.post('/rps.json', (req, res, next) => {
      let room = { title: req.body.title };
      if (req.body.desc) room.desc = req.body.desc;
      let result = normalize(room, newRpSchema);
      if (!result.valid) return next(new Error(result.error));
      
      let numCryptoBytes = options.rpCodeLength * 2; // ample bytes just in case
      crypto.randomBytes(numCryptoBytes, gotBytes);
      
      function gotBytes(err, buffer) {
         let token = buffer.toString('base64');
         let rpCode = token.match(new RegExp(options.rpCodeCharacters.split('').join('|'), 'g')).join('').substr(0, options.rpCodeLength);
         
         // if it generated a bad or duplicate rp code, try again
         if (rpCode.length !== options.rpCodeLength) { // TODO ensure it doesn't already exist
            crypto.randomBytes(numCryptoBytes, gotBytes);
            return;
         }
         
         room.rpCode = rpCode;
         room.msgs = [];
         room.charas = [];
         
         db.rooms.insert(room, (err, r) => {
            if (err) return; // TODO refire request
            res.status(201).json({ rpCode: rpCode });
         });
      }
   });
   
   io.on('connection', (socket) => {
      let rpCode;
      let ip = socket.request.connection.remoteAddress;
      let ipid = crypto.createHash('md5').update(ip).digest('hex').substr(0,18);
      socket.on('join rp', (rpCodeToJoin, callback) => {
         if (rpCode) return;
         
         db.rooms.findOne({ rpCode: rpCodeToJoin }, (err, rp) => {
            if (!rp) return;
            
            console.log(rp);
            
            rpCode = rpCodeToJoin;
            socket.join(rpCode);
            callback(rp);
         });
      });
      
      socket.on('add message', (msg, callback) => {
         // validate & normalize
         let result = normalize(msg, messageSchema);
         if (!result.valid) return console.log(result.error);
         msg.timestamp = Date.now() / 1000,
         msg.ipid = ipid;
         
         // store & broadcast
         db.rooms.update({rpCode: rpCode}, {$push: {msgs: msg}}, (err, r) => {
            callback(msg);
            socket.to(rpCode).broadcast.emit('add message', msg);
         });
      });
      socket.on('add character', (chara, callback) => {
         // validate & normalize
         let result = normalize(chara, charaSchema);
         if (!result.valid) return console.log(result.error);
         
         // store & broadcast
         db.rooms.update({rpCode: rpCode}, {$push: {charas: chara}}, (err, r) => {
            callback(chara);
            socket.to(rpCode).broadcast.emit('add character', chara);
         });
      });
   });
   
   router.get('/rps/:rpCode/page/:pageNum.json', (req, res, next) => {
      let pageNum = req.params.pageNum;
      if (!(pageNum >= 0) || pageNum%0) return next(new Error('Bad page number'));
      let numPages = Math.max(Math.ceil(req.rp.msgs.length/options.pageSize), 1);
      let out = {
         title: req.rp.title,
         desc: req.rp.desc,
         numPages: numPages
      };
      if (pageNum > numPages) {
         out.error = `Page not found: ${pageNum}`;
         return res.status(404).json(out);
      }
      let pageStart = (pageNum-1)*options.pageSize;
      out.msgs = req.rp.msgs.slice(pageStart, pageStart+options.pageSize);
      out.charas = out.msgs
         .filter(m=>m.type==='chara')
         .map(m=>m.charaId)
         .reduce((arr,id)=>{ if(!(id in arr)) arr[id] = id; return arr; }, [])
         .map(id=>req.rp.charas[id]);
      
      res.status(200).json(out);
   });
   
   router.get('/rps/:rpCode.txt', (req, res, next) => {
      res.type('.txt');
      res.attachment(req.rp.title + '.txt');
      
      let out = req.rp.msgs;
      if (!req.query.ooc) out = out.filter(msg=>msg.type !== 'ooc');
      out = out.map(msg=>{
         if(msg.type === 'narrator') {
            return wordwrap(72)(msg.content);
         }
         else if(msg.type === 'ooc') {
            return wordwrap(72)(`(( OOC: ${msg.content} ))`);
         }
         else if(msg.type === 'chara') {
            return `${req.rp.charas[msg.charaId].name.toUpperCase()}:\n`
               + wordwrap(2, 72)(msg.content);
         }
         else {
            throw new Error(`Unexpected message type: ${msg.type}`);
         }
      });
      out.unshift(`${req.rp.title}\n${req.rp.desc}\n----------`);
      res.send(out.map(msg=>msg.replace('\n', '\r\n')).join('\r\n\r\n'));
   });
   
   router.all('*', (req, res, next) => {
      next(new Error('unknown API call'));
   });
   
   // ERROR HANDLING
   router.use((err, req, res, next) => {
      res.status(400).json({ error: err.message });
   });
   
   // ok
   return router;
};

