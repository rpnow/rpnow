//load modules
const express = require('express');
const logger = require('morgan');
const compression = require('compression');
// const favicon = require('serve-favicon');

// server start
module.exports.start = function(options, callback) {
   this.quiet = options && (options === 'quiet' || options.quiet);
   
   if (this.server) {
      if (!this.quiet) console.log('Server already started.');
      if (callback) callback();
      return;
   }
   
   //create express app
   if (!this.quiet) console.log('Starting RPNow server at '+__filename);
   var app = express();
   
   if (!this.quiet) console.log('Adding middleware.');
   if (!this.quiet) app.use(logger('dev'));
   app.use(compression());
   // app.use(favicon(WEB + '/favicon.ico'));
   
   if (!this.quiet) console.log('Setting up app behavior.');
   app.use(express.static(__dirname.replace('server','static'))); //express is serving static files as if it were Apache
   app.use('/api/v1', require('./api'));
   app.use('/', require('./serve-frontend'));
   
   var port = (options && options.port) || process.env.PORT;
   var ip = (options && options.ip) || process.env.IP;
   this.server = app.listen(port, ip, ()=>{
      if (!this.quiet) console.log(`Running. (Listening on ${ip}:${port})`);
      if (callback) callback();
   });
};

module.exports.stop = function(reason, callback) {
   if (!this.server) {
      if (!this.quiet) console.log('No server to stop.');
      if (callback) callback();
      return;
   }
   
   if (!this.quiet) console.log(`Attempting graceful shutdown: ${reason}`);
   this.server.close(() => { 
      if (!this.quiet) console.log('Shutdown complete.');
      this.server = null;
      if (callback) callback();
   });
};
