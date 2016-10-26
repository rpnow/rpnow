//load modules
const express = require('express');
const logger = require('morgan');
const compression = require('compression');
// const favicon = require('serve-favicon');

const defaultOptions = {
   ip: process.env.IP || '0.0.0.0',
   port: process.env.PORT || 80,
   quiet: false,
   rpCodeCharacters: 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789',
   rpCodeLength: 8,
   pageSize: 20,
   refreshMs: 2000,
   rateLimit: true,
   trustProxy: false
};


// server start
module.exports.start = function(runOptions, callback) {
   if (!runOptions) {
      this.options = defaultOptions;
   }
   else {
      this.options = {};
      for (var key in defaultOptions) {
         if (key in runOptions) this.options[key] = runOptions[key];
         else this.options[key] = defaultOptions[key];
      }
   }
   
   if (this.server) {
      if (!this.options.quiet) console.log('Server already started.');
      if (callback) callback();
      return;
   }
   
   //create express app
   if (!this.options.quiet) console.log('Starting RPNow server at '+__filename);
   var app = express();
   
   if (!this.options.quiet) console.log('Adding middleware.');
   if (!this.options.quiet) app.use(logger('dev'));
   if (this.options.trustProxy) app.enable('trust proxy'); // useful for reverse proxies
   app.use(compression());
   // app.use(favicon(WEB + '/favicon.ico'));
   
   if (!this.options.quiet) console.log('Setting up app behavior.');
   app.use(express.static(__dirname.replace('server','static'))); //express is serving static files as if it were Apache
   app.use('/api/v1', require('./api')(this.options));
   app.use('/', require('./serve-frontend'));
   
   this.server = app.listen(this.options.port, this.options.ip, ()=>{
      if (!this.options.quiet) console.log(`Running. (Listening on ${this.options.ip}:${this.options.port})`);
      if (callback) callback();
   });
};

module.exports.stop = function(reason, callback) {
   if (!this.server) {
      if (!this.options.quiet) console.log('No server to stop.');
      if (callback) callback();
      return;
   }
   
   if (!this.options.quiet) console.log(`Attempting graceful shutdown: ${reason}`);
   this.server.close(() => { 
      if (!this.options.quiet) console.log('Shutdown complete.');
      this.server = null;
      if (callback) callback();
   });
};
