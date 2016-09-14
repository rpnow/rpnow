console.log('Starting server at '+__filename);

//load modules
var express = require('express');

//load express middleware modules
var logger = require('morgan');
var compression = require('compression');
// var favicon = require('serve-favicon');

//create express app
var app = express();

//insert middleware
app.use(logger('dev'));
app.use(compression());
// app.use(favicon(WEB + '/favicon.ico'));

//app behavior
const STATIC = __dirname.replace('server','static');
app.use(express.static(STATIC)); //express is serving static files as if it were Apache
app.use('/api/v1', require('./api'));
app.get('*', (req, res) => res.status(404).sendFile(STATIC + '/404.html'));

var server = app.listen(process.env.PORT, process.env.IP);
console.log('Running.');

//shutdown behavior
function gracefulShutdown(msg) {
   console.log(`Graceful shutdown: ${msg}`);
   server.close(console.log.bind(this, 'Shutdown complete.'));
}
process.on('SIGTERM', gracefulShutdown.bind(this, 'SIGTERM')); //kill (terminate)
process.on('SIGINT', gracefulShutdown.bind(this, 'SIGINT')); //Ctrl+C (interrupt)
