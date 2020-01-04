const express = require('express');
const cookieParser = require('cookie-parser');
const Busboy = require('busboy');
const { generateTextFile } = require('./services/txt-file');
const { exportRp, importRp } = require('./services/json-file');
const cuid = require('cuid');
const DB = require('./services/database');
const { validate } = require('./services/validate-user-documents');
const { generateAnonCredentials, authMiddleware } = require('./services/anon-credentials');
const discordWebhooks = require('./services/discord-webhooks');

// Express is our HTTP server
const server = express();

// trust Glitch.com's reverse proxy that sits in front of this server
server.set('trust proxy', true);

// Add x-robots-tag header to all pages served by app 
server.use((req, res, next) => {
  res.set('X-Robots-Tag', 'noindex');
  next();
});

// Redirect all HTTP routes to HTTPS
server.use((req, res, next) => {
  if(req.get('X-Forwarded-Proto').indexOf("https")!=-1){
    next()
  } else {
    res.redirect('https://' + req.hostname + req.url);
  }
});

// Serve frontend HTML, etc
server.use('/', express.static('views'));

// API
const api = new express.Router();
server.use('/api', api);
api.use(express.json({ limit: '500mb' }));
api.use(cookieParser());
api.use((req, res, next) => {
  res.set('Cache-Control', 'no-cache');
  next();
})
api.use(authMiddleware.unless({path: ['/user/anon']}))

// TODO store in database
let title = 'My New Story'

const rpListeners = new Set();

function broadcast(obj) {
  rpListeners.forEach(fn => fn(obj))
}

// helper function to wrap up an async function to be used in Express
function awrap(fn) {
  return function asyncWrapper(...args) {
    const next = args[args.length - 1];
    return fn(...args).catch(next);
  }
}

/**
 * Generate a new set of credentials for an anonymous user
 */
// TODO establish new way of authentication
api.post('/user/anon', awrap(async (req, res, next) => {
  const credentials = generateAnonCredentials();
  res.cookie('usertoken', credentials.token, {
    // path: '/api',
    maxAge: 1000 * 60 * 60 * 24 * 90, // 90 days
    httpOnly: true,
    secure: true,
    // sameSite: 'strict',
  })
  res.status(200).json(credentials);
}));

/**
 * Import RP from JSON
 */
let importStatus = null;

api.post('/rp/import', awrap(async (req, res, next) => {
  const { userid } = req.user;
  const ip = req.ip;

  const busboy = new Busboy({ headers: req.headers });

  busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
    if (fieldname !== 'file') return file.resume();

    file.on('end', () => {
      importStatus = { status: 'pending' };
      res.sendStatus(202);
    });

    importRp(userid, ip, file, async (err) => {
      if (err) {
        importStatus = { status: 'error', error: err.message };
      } else  {
        importStatus = { status: 'success' };              
      }

    });
  });

  return req.pipe(busboy);
}));

api.get('/rp/import', awrap(async (req, res, next) => {
  if (!importStatus) return res.status(404).json({ error: 'Import expired' })
  return res.status(200).json(importStatus);
}));

/**
 * RP Chat Stream
 */
api.get('/rp/chat', awrap(async (req, res, next) => {
  const send = obj => res.write(JSON.stringify(obj)+'\n')
  
  res.on("close", () => rpListeners.delete(send));
  
  // TODO if import is in progress, send notice and then wait

  const snapshot = await DB.lastEventId();
  const msgs = await DB.getDocs('msgs', { reverse: true, limit: 60, snapshot }).asArray();
  msgs.reverse();
  const charas = await DB.getDocs('charas', { snapshot }).asArray();
  
  send({
    type: 'init',
    data: { title, msgs, charas }
  });
  
  rpListeners.add(send);
}));

/**
 * Count the pages in an RP's archive
 */
api.get(`/rp/pages`, awrap(async (req, res, next) => {
  const msgCount = await DB.getDocs('msgs').count();
  const pageCount = Math.ceil(msgCount / 20);

  res.status(200).json({ title, pageCount })
}));

/**
 * Get a page from an RP's archive
 */
api.get(`/rp/pages/:pageNum([1-9][0-9]{0,})`, awrap(async (req, res, next) => {
  const skip = (req.params.pageNum - 1) * 20;
  const limit = 20;

  const snapshot = await DB.lastEventId();
  const msgs = await DB.getDocs('msgs', { skip, limit, snapshot }).asArray();
  const charas = await DB.getDocs('charas', { snapshot }).asArray();

  const msgCount = await DB.getDocs('msgs').count();
  const pageCount = Math.ceil(msgCount / 20);

  res.status(200).json({ title, msgs, charas, pageCount })
}));

/**
 * Get and download a .txt file for an entire RP
 */
api.get(`/rp/download.txt`, awrap(async (req, res, next) => {
  // TODO getting all msgs at once is potentially problematic for huge RP's; consider using streams if possible
  const msgs = await DB.getDocs('msgs').asArray(); 
  const charasMap = await DB.getDocs('charas').asMap();
  const { includeOOC = false } = req.query;

  res.attachment(`${title}.txt`).type('.txt');
  generateTextFile({ title, msgs, charasMap, includeOOC }, str => res.write(str));
  res.end();
}));

/**
 * Get and download a .txt file for an entire RP
 */
api.get(`/rp/export`, awrap(async (req, res, next) => {
  res.attachment(`${title}.json`).type('.json');
  await exportRp(str => res.write(str));
  res.end();
}));

/**
 * Create something in an RP (message, chara, etc)
 */
api.post(`/rp/:collection(msgs|charas)`, awrap(async (req, res, next) => {
  const collection = req.params.collection;
  const _id = cuid();
  const fields = req.body;
  await validate(collection, fields);
  const { userid } = req.user;
  const ip = req.ip;

  const { doc } = await DB.addDoc(collection, _id, fields, { userid, ip });

  broadcast({ type: collection, data: doc })
  
  if (collection === 'msgs') {
    discordWebhooks.send(title, fields);
  }

  res.status(201).json(doc);
}));

/**
 * Update something in an RP (message, chara, etc)
 */
api.put(`/rp/:collection(msgs|charas)/:doc_id([a-z0-9]+)`, awrap(async (req, res, next) => {
  const collection = req.params.collection;
  const _id = req.params.doc_id;
  const fields = req.body;
  await validate(collection, fields);
  const { userid } = req.user;
  const ip = req.ip;

  const oldDoc = await DB.getDoc(collection, _id);
  if (!oldDoc) return res.sendStatus(404);

  const { doc } = await DB.updateDoc(collection, _id, fields, { userid, ip });

  broadcast({ type: collection, data: doc })

  res.status(200).json(doc);
}));

/**
 * Get the history of something in an RP (message, chara, etc)
 */
api.get(`/rp/:collection(msgs|charas)/:doc_id([a-z0-9]+)/history`, awrap(async (req, res, next) => {
  const collection = req.params.collection;
  const _id = req.params.doc_id;

  const docs = await DB.getDocs(collection, { _id, includeHistory: true }).asArray();

  res.status(200).json(docs);
}));

/**
 * Update RP title
 */
api.put(`/rp/title`, awrap(async (req, res, next) => {
  const newTitle = req.body
    && req.body.title
    && (typeof req.body.title === 'string')
    && req.body.title.length < 30
    && req.body.title;
  
  if (newTitle) {
    title = newTitle;
    broadcast({ type: 'title', data: title })
    res.sendStatus(204);
  } else {
    next(new Error('invalid title'))
  }
}));

/**
 * Add webhook
 */
api.put(`/rp/webhook`, awrap(async (req, res, next) => {
  const { webhook } = req.body;
  if (typeof webhook !== 'string') return res.status(400).json({ error: "No webhook provided" })
  
  await discordWebhooks.test(webhook);
  
  await DB.addDoc('webhooks', webhook, { webhook });
  
  res.sendStatus(204);
}));

/**
 * Default route (route not found)
 */
api.all('*', (req, res, next) => {
  next(new Error('unknown request'));
});

/**
 * Error handling
 */
api.use((err, req, res, next) => {
  console.error(err);
  if (err.name === 'UnauthorizedError') {
    res.status(401).json({ error: err.message });
  } else {
    res.status(400).json({ error: err.message });
  }
});

// start server
const listener = server.listen(process.env.PORT || 13000, (err) => {
  if (err) {
    console.error(`Failed to start: ${err}`);
    process.exit(1);
  } else {
    console.log("Your app is listening on port " + listener.address().port);
  }
});
