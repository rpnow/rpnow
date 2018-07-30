module.exports = require('nconf')
    .add('memory')
    .env()
    .defaults({
        trustProxy: true,
        allowCORS: true,
        logLevel: 'info',

        port: 3000,
        DB_HOST: 'localhost',
    });
