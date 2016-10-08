//load modules
const express = require('express');
const logger = require('morgan');
const compression = require('compression');
// const favicon = require('serve-favicon');

// server start
module.exports.start = function(ip, port, callback) {
   if (this.server) {
      console.log('Server already started.');
      return;
   }
   
   //create express app
   console.log('Starting RPNow server at '+__filename);
   var app = express();
   
   console.log('Adding middleware.');
   app.use(logger('dev'));
   app.use(compression());
   // app.use(favicon(WEB + '/favicon.ico'));
   
   console.log('Setting up app behavior.');
   app.use(express.static(__dirname.replace('server','static'))); //express is serving static files as if it were Apache
   app.use('/api/v1', require('./api'));
   app.use('/', require('./serve-frontend'));
   
   port = port || process.env.PORT;
   ip = ip || process.env.IP;
   this.server = app.listen(port, ip, ()=>{
      console.log(`Running. (Listening on ${ip}:${port})`);
      if (callback) callback();
   });
};

module.exports.stop = function(reason) {
   if (!this.server) {
      console.log('No server to stop.');
      return;
   }
   
   console.log(`Attempting graceful shutdown: ${reason}`);
   this.server.close(() => { 
      console.log('Shutdown complete.');
      this.server = null;
   });
};
