const logger = require('./services/logger');
const config = require('./config');

logger.debug('Starting RPNow API...');

let app = require('express')();
let server = require('http').createServer(app);
app.use('/api', require('./api/api.rest'));

require('./api/api.sockets')(server);

let listener = server.listen(config.get('port'), (err) => {
    if (err) logger.error(err);
    else logger.info('RPNow API: ready.');
});
