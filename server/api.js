/* REST calls for RPNow.
   Documentation: https://docs.google.com/spreadsheets/d/1IfC8TYu8kgqLAm1TsC1saRJsD_cxFdgz0C-YMcoYsB0
*/

var express = require('express');
var router = express.Router();
module.exports = router;

var bodyParser = require('body-parser');
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));

var crypto = require('crypto');

const PAGE_SIZE = 20;
const REFRESH_MILLIS = 2000;

var rooms = {};

function rpMiddleware(req, res, next) {
   req.rp = rooms[req.params.rpCode];
   if (!req.rp) return res.status(404).json({ error: 'RP not found'});
   return next();
}
router.use('/rps/:rpCode.json', rpMiddleware);
router.use('/rps/:rpCode/*', rpMiddleware);

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

// REST API
router.post('/rps.json', cleanParams({ 'title':30, 'desc':[255] }), (req, res, next) => {
   var rpCodeCharacters = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
   var rpCode = '........'.replace(/./g, ()=>rpCodeCharacters.charAt(Math.random() * rpCodeCharacters.length));
   
   rooms[rpCode] = {
      rpCode: rpCode,
      title: req.body.title,
      desc: (req.body.desc || ""),
      msgs: [],
      charas: [],
      updateList: [],
      addUpdateEntry: function() { console.log(this); this.updateList.push({ msgCount: this.msgs.length, charaCount: this.charas.length }); }
   };
   rooms[rpCode].addUpdateEntry();
   
   res.status(201).json({ rpCode: rpCode });
});

router.get('/rps/:rpCode.json', (req, res, next) => {
   res.status(200).json({
      title: req.rp.title,
      desc: req.rp.desc,
      msgs: req.rp.msgs.slice(-PAGE_SIZE),
      charas: req.rp.charas,
      pageSize: PAGE_SIZE,
      refreshMillis: REFRESH_MILLIS,
      updateCounter: req.rp.updateList.length-1
   });
});

router.get('/rps/:rpCode/updates.json', (req, res, next) => {
   var updateCounter = +req.query.updateCounter;
   if (!(updateCounter >= 0)) return next(new Error('Invalid updateCounter value'));
   if (updateCounter > req.rp.updateList.length-1) next(new Error('updatecounter larger than latest available update'));
   if (updateCounter === req.rp.updateList.length-1) {
      res.sendStatus(204);
      return;
   }
   
   var lastClientUpdate = req.rp.updateList[updateCounter]
   res.status(200).json({
      msgs: req.rp.msgs.slice(lastClientUpdate.msgCount),
      charas: req.rp.charas.slice(lastClientUpdate.charaCount),
      updateCounter: req.rp.updateList.length-1
   });
});

router.get('/rps/:rpCode/page/:pageNum.json', (req, res, next) => {
   var pageNum = req.params.pageNum;
   if (!(pageNum >= 0) || pageNum%0) return next(new Error('Bad page number'));
   if (req.rp.msgs.length === 0) return next(new Error('RP has no content.'));
   var out = {
      title: req.rp.title,
      desc: req.rp.desc
   };
   var pageStart = (pageNum-1)*PAGE_SIZE;
   var msgs = req.rp.msgs.slice(pageStart, pageStart+PAGE_SIZE);
   if (msgs.length === 0) {
      out.error = `Page not found: ${pageNum}`;
      return res.status(404).json(out);
   }
   out.msgs = msgs;
   out.charas = out.msgs
      .filter(m=>m.type==='chara')
      .map(m=>m.charaId)
      .reduce((arr,id)=>{ if(id in arr) arr[id] = id; }, [])
      .map(id=>req.rp.charas[id]);
   res.status(200).json(out);
});

router.post('/rps/:rpCode/msg.json', cleanParams({ content: 10000 }), (req, res, next) => {
   var msg = req.body;
   // message validation
   if (['narrator', 'chara', 'ooc'].indexOf(msg.type) === -1) return next(new Error('Bad message type.'));
   if (msg.type === 'chara') {
      if (!(msg.charaId >= 0)) return next(new Error('Bad or missing chara id.'));
      if (!req.rp.charas[msg.charaId]) return next(new Error('Invalid chara id.'));
   }
   // submit message
   req.rp.msgs.push({
      id: req.rp.msgs.length,
      type: msg.type,
      content: msg.content,
      charaId: msg.charaId,
      timestamp: Date.now() / 1000,
      ipid: crypto.createHash('md5').update(req.ip).digest('hex').substr(0,18)
   });
   req.rp.addUpdateEntry();
   res.status(201).json({ id: req.rp.msgs.length - 1 });
});

router.post('/rps/:rpCode/chara.json', cleanParams({ name: 30, color: /^#[0-9a-f]{6}$/gi }), (req, res, next) => {
   var chara = req.body;
   req.rp.charas.push({
      id: req.rp.charas.length,
      name: chara.name,
      color: chara.color,
      ipid: crypto.createHash('md5').update(req.ip).digest('hex').substr(0,18)
   });
   req.rp.addUpdateEntry();
   res.status(201).json({ id: req.rp.charas.length - 1 });
});

router.get('/rps/:rpCode.txt', (req, res, next) => {
   // TODO
});

router.all('*', (req, res, next) => {
   next(new Error('unknown API call'));
});

// ERROR HANDLING
router.use((err, req, res, next) => {
   res.status(400).json({ error: err.message });
   console.error(err);
});
