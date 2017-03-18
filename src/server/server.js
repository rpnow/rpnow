//load modules
const express = require('express');
const http = require('http');
const io = require('socket.io');
const logger = require('morgan');
const compression = require('compression');
const favicon = require('serve-favicon');
const noop = function(){};

const defaultOptions = {
   ip: process.env.IP || '0.0.0.0',
   port: process.env.PORT || 80,
   db: process.env.DB_HOST || 'localhost',
   logging: true,
   rpCodeCharacters: 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789',
   rpCodeLength: 8,
   trustProxy: false
};

let listener;

// server start
module.exports.start = function(customOptions = {}, callback = noop) {
   if (listener) {
      callback('Server already started.');
      return;
   }
   
   let options = JSON.parse(JSON.stringify(defaultOptions))
   for (let key in customOptions) options[key] = customOptions[key];
    
   //create express app
   let app = express();
   let server = http.Server(app);

   let srcRoot = __dirname.replace('src/server','src');
   
   app.use(favicon(`${srcRoot}/www/favicon.ico`));
   if (options.logging) app.use(logger('dev'));
   if (options.trustProxy) app.enable('trust proxy'); // useful for reverse proxies
   app.use(compression());
   
   app.use(express.static(`${srcRoot}/www`));
   app.get('*', (req, res) => res.sendFile(`${srcRoot}/www/app/index.html`));

   require('./api')(options, io(server));
   
   listener = server.listen(options.port, options.ip, ()=>{
      callback(null, listener, options);
   });
};

module.exports.stop = function(callback = noop) {
   if (!listener) {
      callback('No server to stop.');
      return;
   }
   
   listener.close(() => { 
      listener = null;
      callback();
   });
};
