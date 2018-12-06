const logger = require('./services/logger');
const config = require('./services/config');
const { getMyIpAddresses } = require('./services/get-my-ip-addresses');
const app = require('./app');

app.listen(config.port, (err) => {
    if (err) {
        logger.error(`RPNow failed to start: ${err}`);
    } else {
        logger.info('RPNow is running!');
        logger.info(`You may access it in your browser at http://localhost:${config.port}`);
        const addresses = getMyIpAddresses().map(ip => `http://${ip}:${config.port}`);
        if (addresses.length === 0) {
            logger.info("(We could not determine what address it is available at for other computers.)");
        } else if(addresses.length === 1) {
            logger.info(`Other devices should navigate to this computer's local network IP, which is probably: ${addresses[0]}`);
        } else {
            logger.info("Other devices should navigate to this computer's local network IP, which is probably one of the following:")
            addresses.forEach(address => logger.info(address));
        }
        logger.info('Have fun!');
    }
});
