//load modules
const express = require('express');
const logger = require('morgan');
const compression = require('compression');
// const favicon = require('serve-favicon');

const defaultOptions = {
   ip: process.env.IP,
   port: process.env.PORT,
   logging: true,
   rpCodeCharacters: 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789',
   rpCodeLength: 8,
   pageSize: 20,
   refreshMs: 2000,
   rateLimit: true,
   trustProxy: false
};

var server;

// server start
module.exports.start = function(customOptions, callback) {
   if (server) {
      if (callback) callback('Server already started.');
      return;
   }
   
   server = {
      listener: null,
      options: JSON.parse(JSON.stringify(defaultOptions))
   };
   if (customOptions) {
      for (var key in customOptions) server.options[key] = customOptions[key];
   }
    
   //create express app
   var app = express();
   
   if (server.options.logging) app.use(logger('dev'));
   if (server.options.trustProxy) app.enable('trust proxy'); // useful for reverse proxies
   app.use(compression());
   // app.use(favicon(WEB + '/favicon.ico'));
   
   app.use(express.static(__dirname.replace('server','static'))); //express is serving static files as if it were Apache
   app.use('/api/v1', require('./api')(server.options));
   app.use('/', require('./serve-frontend'));
   
   server.listener = app.listen(server.options.port, server.options.ip, ()=>{
      if (callback) callback(null, server.listener, server.options);
   });
};

module.exports.stop = function(reason, callback) {
   if (!server) {
      if (callback) callback('No server to stop.');
      return;
   }
   
   server.listener.close(() => { 
      server = null;
      if (callback) callback();
   });
};
