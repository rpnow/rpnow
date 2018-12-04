const config = require('./config');
const winston = require('winston');

winston.setLevels(winston.config.syslog.levels);
winston.level = config.logLevel;

module.exports = winston;
