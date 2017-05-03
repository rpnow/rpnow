const nconf = module.exports = require('nconf')
    .add('memory')
    .env()
    .defaults({
        "trustProxy": true,
        "logLevel": "info",

        "port": 3000,
        "DB_HOST": "localhost",

        "maxTitleLength": 30,
        "maxDescLength": 255,
        "maxCharaNameLength": 30,
        "maxMessageContentLength": 10000,

        "rpCodeLength": 8,
        "rpCodeChars": "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    })
