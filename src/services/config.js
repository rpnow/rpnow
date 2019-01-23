const path = require('path');
const os = require('os');

function getDataDirectory() {
    const userData = process.env.APPDATA || os.homedir()
    
    return path.join(userData, 'rpnow_data');
}

module.exports = {
    port: (+process.env.RPNOW_PORT) || 80,
    trustProxy: (process.env.RPNOW_TRUST_PROXY || '').toLowerCase() === 'true',
    dataDir: (process.env.RPNOW_DATA_DIR) || getDataDirectory(),
};
