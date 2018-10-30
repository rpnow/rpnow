const config = require('../config');
const logger = require('../services/logger');

if (config.get('dbHost')) {
    logger.info(`Using MongoDB for persistence: ${config.get('dbHost')}`);
    module.exports = require('./dao.mongo');
} else {
    logger.info('Using sqlite for persistence');
    module.exports = require('./dao.sqlite');
}
