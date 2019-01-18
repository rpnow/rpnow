const fs = require('fs');
const path = require('path');
const axios = require('axios');
const config = require('./config');

const pidPath = path.join(config.dataDir, '/lastport.lock');

module.exports = async function isAlreadyRunning() {
    let isRunning;

    if (fs.existsSync(pidPath)) {
        const lastPort = fs.readFileSync(pidPath).toString('utf8')
        isRunning = await axios.get(`http://0.0.0.0:${lastPort}/api/health`)
            .then(res => res.data.rpnow === 'ok')
            .catch(() => false);
    } else {
        isRunning = false;
    }

    if (!isRunning) {
        fs.writeFileSync(pidPath, config.port);
    }

    return isRunning;
};
