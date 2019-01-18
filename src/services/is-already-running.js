const fs = require('fs');
const path = require('path');
const got = require('got');
const config = require('./config');

const pidPath = path.join(config.dataDir, '/lastport.lock');

module.exports = async function isAlreadyRunning() {
    let isRunning;

    if (fs.existsSync(pidPath)) {
        const lastPort = fs.readFileSync(pidPath).toString('utf8')
        isRunning = await got(`http://0.0.0.0:${lastPort}/api/health`)
            .then(res => JSON.parse(res.body).rpnow === 'ok')
            .catch(() => false);
    } else {
        isRunning = false;
    }

    if (!isRunning) {
        fs.writeFileSync(pidPath, config.port);
    }

    return isRunning;
};
