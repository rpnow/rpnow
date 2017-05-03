const config = require('./config');
const winston = module.exports = require('winston');

winston.setLevels(winston.config.syslog.levels);
winston.level = config.get('logLevel');
