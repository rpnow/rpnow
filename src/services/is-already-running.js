const fs = require('fs');
const path = require('path');
const axios = require('axios');

module.exports = {
    async isAlreadyRunning(dataDir) {
        const pidPath = path.join(dataDir, '/lastport.lock');

        if (!fs.existsSync(pidPath)) return false;

        const lastPort = fs.readFileSync(pidPath).toString('utf8')
        return axios.get(`http://0.0.0.0:${lastPort}/api/health`)
            .then(res => res.data.rpnow === 'ok')
            .catch(() => false);
    },

    notifyRunning(dataDir, port) {
        const pidPath = path.join(dataDir, '/lastport.lock');

        fs.writeFileSync(pidPath, port);
    },
};
