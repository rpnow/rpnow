const camelcase = require('camelcase');
const conf = require('nconf')
    .add('memory')
    .env({
        transform(obj) {
            if (!/^RPNOW_/.test(obj.key)) return false;
            return {
                ...obj,
                key: camelcase(obj.key.substr('RPNOW_'.length)),
            };
        },
        parseValues: true,
    })
    .defaults({
        port: 80,
        trustProxy: false,
        cors: false,
        logLevel: 'info',
        bundleCompression: '',
    });

conf.required(['dbHost']);

module.exports = conf;
