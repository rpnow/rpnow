/* REST calls for RPNow.
   Documentation: https://docs.google.com/spreadsheets/d/1IfC8TYu8kgqLAm1TsC1saRJsD_cxFdgz0C-YMcoYsB0
*/

const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const wordwrap = require('wordwrap');
const RateLimit = require('express-rate-limit');
const mongojs = require('mongojs');

module.exports = function(options, io) {
   var router = express.Router();
   
   router.use(bodyParser.json());
   router.use(bodyParser.urlencoded({ extended: true }));
   if (options.rateLimit) router.use('/', new RateLimit({
      windowMs: 1000*60,
      delayAfter: (1000*60)/options.refreshMs,
      delayMs: 100,
      max: 0
   }));
   router.use('/rps/:rpCode.json', rpMiddleware);
   router.use('/rps/:rpCode.txt', rpMiddleware);
   router.use('/rps/:rpCode/*', rpMiddleware);
   
   var rooms;
   var db = mongojs('localhost/rpnow', ['rps']);
   db.rps.findOne({ _id:'everyRP' }, function(err, doc) {
      if (err) throw err;
      rooms = doc? doc.rooms: {};
      
      setInterval(()=> {
         db.rps.save({ _id: 'everyRP', rooms: JSON.parse(JSON.stringify(rooms)) });
      }, 5*1000);
   });

   function rpMiddleware(req, res, next) {
      req.rp = rooms[req.params.rpCode];
      if (!req.rp) return res.status(404).json({ error: 'RP not found'});
      return next();
   }
   
   function cleanParams(params) {
      return function(req, res, next) {
         for (var x in params) {
            var optional = Array.isArray(params[x]);
            var requirement = optional? params[x][0]: params[x];
            
            var string = req.body[x];
            if (string === undefined || string === null) {
               if (optional) continue;
               else return next(new Error(`Missing variable: ${x}`));
            }
            
            if (typeof(string) !== 'string') return next(new Error(`${x} is not a string.`));
            if (typeof(requirement) === 'number') {
               if (string.length > requirement) return next(new Error(`${x} is longer than ${requirement} characters.`));
               var trimmed = string.trim();
               if (trimmed.length === 0 && !optional) return next(new Error(`${x} is empty or whitespace.`));
               req.body[x] = trimmed;
            }
            else if (requirement instanceof RegExp) {
               if (!string.match(requirement)) return next(new Error(`${x} is not in the correct format: ${requirement.toString()}`));
               req.body[x] = string;
            }
            
         }
         return next();
      };
   }
   
   router.post('/rps.json', cleanParams({ 'title':30, 'desc':[255] }), (req, res, next) => {
      var numCryptoBytes = options.rpCodeLength * 2; // ample bytes just in case
      
      crypto.randomBytes(numCryptoBytes, gotBytes);
      
      function gotBytes(err, buffer) {
         var token = buffer.toString('base64');
         var rpCode = token.match(new RegExp(options.rpCodeCharacters.split('').join('|'), 'g')).join('').substr(0, options.rpCodeLength);
         
         // if it generated a bad or duplicate rp code, try again
         if (rpCode.length !== options.rpCodeLength || rooms[rpCode]) {
            crypto.randomBytes(numCryptoBytes, gotBytes);
            return;
         }
         
         rooms[rpCode] = {
            rpCode: rpCode,
            title: req.body.title,
            desc: (req.body.desc || ""),
            msgs: [],
            charas: []
         };
         
         res.status(201).json({ rpCode: rpCode });
      }
   });
   
   function normalizeMessage(msg) {
      // message validation
      // TODO trim whitespace
      if (msg.content.length > 10000) return { error: 'Message too long.' };
      if (['narrator', 'chara', 'ooc'].indexOf(msg.type) === -1) return { error: 'Bad message type.' };
      if (msg.type === 'chara') {
         var chara = normalizeCharacter(msg.chara);
         if (chara.error) return { error: chara.error };
         msg.chara = chara;
      }
      // normalize message
      return {
         type: msg.type,
         content: msg.content,
         chara: msg.chara
      };
   }
   
   function normalizeCharacter(chara) {
      // validation
      // TODO trim whitespace
      if (chara.name.length > 30) return { error: 'Name too long.' };
      if (!(chara.color.match(/^#[0-9a-f]{6}$/gi))) return { error: 'Invalid color.' };
      if (chara.textColor && !(chara.color.match(/^#[0-9a-f]{6}$/gi))) return { error: 'Invalid text color.' };
      // noarmlaize
      return {
         name: chara.name,
         color: chara.color,
         textColor: chara.textColor || contrastColor(chara.color)
      };
   }
   function contrastColor(color) {
      //YIQ algorithm modified from:
      // http://24ways.org/2010/calculating-color-contrast/
      var components = [1,3,5].map(i => parseInt(color.substr(i, 2), 16));
      var yiq = components[0]*0.299 + components[1]*0.597 + components[2]*0.114;
      return (yiq >= 128) ? '#000000' : '#ffffff';
   }
   
   io.on('connection', (socket) => {
      var rp;
      var ip = socket.request.connection.remoteAddress;
      var ipid = crypto.createHash('md5').update(ip).digest('hex').substr(0,18);
      socket.on('join rp', (rpCode, callback) => {
         if (rp) return;
         
         rp = rooms[rpCode];
         if (!rp) return;
         
         console.log(rp);
         socket.join(rpCode);
         callback(rp);
      });
      
      socket.on('add message', (msg, callback) => {
         msg = normalizeMessage(msg);
         if (msg.error) return console.log(msg.error);
         msg.timestamp = Date.now() / 1000,
         msg.ipid = ipid;
         
         // store & broadcast
         rp.msgs.push(msg);
         callback(msg);
         socket.to(rp.rpCode).broadcast.emit('add message', msg);
      });
      socket.on('add character', (chara, callback) => {
         chara = normalizeCharacter(chara);
         if (chara.error) return console.log(chara.error);
         chara.timestamp = Date.now() / 1000,
         chara.ipid = ipid;
         
         // store
         rp.charas.push(chara);
         // broadcast
         callback(chara);
         socket.to(rp.rpCode).broadcast.emit('add character', chara);
      });
   });
   
   router.get('/rps/:rpCode/page/:pageNum.json', (req, res, next) => {
      var pageNum = req.params.pageNum;
      if (!(pageNum >= 0) || pageNum%0) return next(new Error('Bad page number'));
      var numPages = Math.max(Math.ceil(req.rp.msgs.length/options.pageSize), 1);
      var out = {
         title: req.rp.title,
         desc: req.rp.desc,
         numPages: numPages
      };
      if (pageNum > numPages) {
         out.error = `Page not found: ${pageNum}`;
         return res.status(404).json(out);
      }
      var pageStart = (pageNum-1)*options.pageSize;
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
      
      var out = req.rp.msgs;
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

