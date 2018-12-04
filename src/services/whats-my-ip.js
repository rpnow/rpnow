/**
 * Provides an array of possible local network IP's for this server.
 * It's only used by index.js to display helpful info to the user.
 */

const os = require('os');

module.exports = function getMyIpAddresses() {
    return Object.values(os.networkInterfaces())
        .map(x => x.find(({ family, internal }) => family === 'IPv4' && !internal))
        .filter(x => x)
        .map(x => x.address);
};
