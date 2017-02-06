//load modules
const express = require('express');
const http = require('http');
const io = require('socket.io');
const logger = require('morgan');
const compression = require('compression');
// const favicon = require('serve-favicon');

const defaultOptions = {
   ip: process.env.IP || '0.0.0.0',
   port: process.env.PORT || 80,
   db: process.env.DB_HOST || 'localhost',
   logging: true,
   rpCodeCharacters: 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789',
   rpCodeLength: 8,
   pageSize: 20,
   refreshMs: 2000,
   rateLimit: true,
   trustProxy: false
};

let listener;

// server start
module.exports.start = function(customOptions = {}, callback) {
   if (listener) {
      if (callback) callback('Server already started.');
      return;
   }
   
   let options = JSON.parse(JSON.stringify(defaultOptions))
   for (let key in customOptions) options[key] = customOptions[key];
    
   //create express app
   let app = express();
   let server = http.Server(app);
   
   if (options.logging) app.use(logger('dev'));
   if (options.trustProxy) app.enable('trust proxy'); // useful for reverse proxies
   app.use(compression());
   // app.use(favicon(WEB + '/favicon.ico'));
   
   app.use(express.static(__dirname.replace('server','static'))); //express is serving static files as if it were Apache
   app.use('/api/v1', require('./api')(options, io(server)));
   app.use('/', require('./serve-frontend'));
   
   listener = server.listen(options.port, options.ip, ()=>{
      if (callback) callback(null, listener, options);
   });
};

module.exports.stop = function(callback) {
   if (!listener) {
      if (callback) callback('No server to stop.');
      return;
   }
   
   listener.close(() => { 
      listener = null;
      if (callback) callback();
   });
};
