var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));

const PAGE_SIZE = 20;
const REFRESH_MILLIS = 2000;

var rooms = {};

function rpMiddleware(req, res, next) {
  req.rp = rooms[req.params.url];
  if (!req.rp) return res.status(404).json({ error: 'RP not found'});
  return next();
}
router.use('/rps/:url.json', rpMiddleware);
router.use('/rps/:url/*', rpMiddleware);

function cleanParams(params) {
  return function(req, res, next) {
    for (var x in params) {
      var maxLength = params[x];
      var optional = Array.isArray(maxLength);
      if (optional) maxLength = maxLength[0];
      
      var string = req.body[x];
      if (string === undefined || string === null) {
        if (optional) continue;
        else return next(new Error(`Missing variable: ${x}`));
      }
      
      if (typeof(string) !== 'string') return next(new Error(`${x} is not a string.`));
      if (string.length > maxLength) return next(new Error(`${x} is longer than ${maxLength} characters.`));
      var trimmed = string.trim();
      if (!trimmed) return next(new Error(`${x} is empty or whitespace.`));
      
      req.body[x] = trimmed;
    }
    return next();
  };
}

// REST API
router.post('/rps.json', cleanParams({ 'title':30, 'desc':[255] }), (req, res, next) => {
  var urlCharacters = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var url = '........'.replace(/./g, ()=>urlCharacters.charAt(Math.random() * urlCharacters.length));
  
  rooms[url] = { url: url, title: req.body.title, desc: req.body.desc, msgs: [], charas: [] };
  res.status(201).json({ url: url });
});

router.get('/rps/:url.json', (req, res, next) => {
  res.status(200).json({
    title: req.rp.title,
    desc: req.rp.desc,
    msgs: req.rp.msgs.slice(-PAGE_SIZE),
    msgCounter: req.rp.msgs.length,
    charas: req.rp.charas,
    pageSize: PAGE_SIZE,
    refreshMillis: REFRESH_MILLIS
  });
});

router.get('/rps/:url/updates.json', (req, res, next) => {
  var msgCounter = req.query.msgCounter;
  var charaCounter = req.query.charaCounter;
  if(!(msgCounter >= 0) || !(charaCounter >= 0)) return next(new Error("Invalid counter values"));
  res.status(200).json({
    msgs: req.rp.msgs.slice(msgCounter),
    charas: req.rp.charas.slice(charaCounter)
  });
});

router.get('/rps/:url/page/:pageNum.json', (req, res, next) => {
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
    .filter(x=>x.type==='character')
    .map(x=>x.charaId)
    .reduce((arr,x)=>{ if(!arr.contains(x)) arr.push(x); return arr; }, [])
    .map(x=>req.rp.charas[x]);
  res.status(200).json(out);
});

router.post('/rps/:url/message.json', cleanParams({ content: 10000 }), (req, res, next) => {
  var msg = req.body;
  // message validation
  if (['narrator', 'character', 'ooc'].indexOf(msg.type)) return next(new Error('Bad message type.'));
  if (msg.type === 'character') {
    if (!(msg.charaId >= 0)) return next(new Error('Bad or missing chara id.'));
    if (!req.rp.charas[msg.charaId]) return next(new Error('Invalid chara id.'));
  }
  // submit message
  req.rp.msgs.push({
    type: msg.type,
    content: msg.content,
    charaId: msg.charaId,
  });
  res.sendStatus(204);
});

router.post('/rps/:url/character.json', cleanParams({ name: 30 }), (req, res, next) => {
  var chara = req.body;
  if (!chara.color || typeof(chara.color) !== 'string') return next(new Error('Invalid chara color.'));
  if (!chara.color.match(/^#[0-9a-f]{6}$/gi)) return next(new Error('Color must be in format #123abc'));
  req.rp.charas.push({
    name: chara.name,
    color: chara.color
  });
  res.sendStatus(204);
});

router.get('/rps/:url/export.txt', (req, res, next) => {
  // TODO
});

// ERROR HANDLING
router.use((err, req, res, next) => {
  res.status(400).json({ error: err.message });
  console.error(err);
});

// export
module.exports = router;
