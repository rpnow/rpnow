#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const DB = require('./services/database');
const app = require('./app');

(async function main() {
    const dataDir = path.join(__dirname, '.data');

    // create data directory if it doesnt exist
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

    // initialize db
    await DB.open(dataDir);

    // enable trustProxy?
    // if (config.trustProxy === true) app.enable('trust proxy');

    // start server
    const port = process.env.PORT || 13000;
    app.listen(port, (err) => {
        if (err) {
            console.error(`ERROR: RPNow failed to start: ${err}`);
            process.exit(1);
            return;
        } else {
            console.log(`Running on port ${port}`);
        }
    });
}());
