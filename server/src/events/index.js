const config = require('../config');
const logger = require('../services/logger');

if (config.get('redisHost')) {
    logger.info('Using redis pub/sub event bus');
    module.exports = require('./events.redis');
} else {
    logger.info('Using in-memory event bus');
    module.exports = require('./events.memory');
}
