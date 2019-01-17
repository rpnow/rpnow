const path = require('path');

function getProjectDirectory() {
    if (process.pkg) {
        return path.dirname(process.argv[0]);
    } else {
        return path.join(path.dirname(process.argv[1]), '..');
    }
}

module.exports = {
    port: (+process.env.RPNOW_PORT) || 13000,
    trustProxy: (process.env.RPNOW_TRUST_PROXY || '').toLowerCase() === 'true',
    cors: (process.env.RPNOW_CORS || '').toLowerCase() === 'true',
    dataDir: (process.env.RPNOW_DATA_DIR) || path.join(getProjectDirectory(), './data'),
};
