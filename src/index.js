#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');
const GreenlockExpress = require('greenlock-express')
const nconf = require('nconf');
const camelcase = require('camelcase');
const ini = require('ini');
const DB = require('./services/database');
const app = require('./app');
const adminApp = require('./admin-api/admin-api');

// get app configuration
const config = nconf
    .argv({
        parseValues: true,
    })
    .env({
        transform({ key, value }) {
            if (!/^RPNOW_/.test(key)) return false;
            return {
                key: camelcase(key.substr('RPNOW_'.length)),
                value
            };
        },
        parseValues: true,
    })
    .add('default configFile location', {
        type: 'literal',
        store: {
            configFile: '/etc/rpnow.ini'
        }
    })
    .file('rpnow.ini config file', {
        file: path.resolve(nconf.get('configFile')),
        format: {
            parse: str => {
                const obj = ini.parse(str);
                Object.entries(obj).forEach(([key, value]) => {
                    try {
                        obj[key] = JSON.parse(value)
                    } catch (_) { /* just use string value */ }
                });
                return obj;
            }
        },
    })
    .defaults({
        dataDir: '/var/local/rpnow',
        port: 80,
        ssl: false,
        sslPort: 443,
        sslDomain: '',
        letsencryptAcceptTOS: false,
        letsencryptEmail: '',
        trustProxy: false,
    })
    .get();

if(fs.existsSync(config.configFile)) {
    console.log('Loaded config from ' + config.configFile)
} else {
    console.log('No config data found at ' + config.configFile)
}

function showError(str) {
    console.error(str);
    process.exit(1);
}

(async function main() {
    // open admin API on loopback-only address
    console.log('Starting admin API on 127.0.0.1:12789')
    await new Promise(resolve => {
        adminApp.listen(12789, '127.0.0.1', err => {
            if (err) showError('Could not bind admin port');
            else resolve()
        });
    });

    // create data directory if it doesnt exist
    if (!fs.existsSync(config.dataDir)) {
        console.log(`Data directory not found at ${config.dataDir}, creating`)
        fs.mkdirSync(config.dataDir);
    } else {
        console.log(`Found data directory at ${config.dataDir}`)
    }

    // initialize db
    console.log(`Loading database in ${config.dataDir}`)
    await DB.open(config.dataDir);

    // enable trustProxy?
    if (config.trustProxy === true) app.enable('trust proxy');

    // start server
    if (config.ssl === true) {
        // ensure we agreed to the letsencrypt TOS
        if (config.letsencryptAcceptTOS !== true) return showError("ERROR: You must accept the Let's Encrypt TOS to use this service.");

        const letsencryptDir = path.resolve(config.dataDir, 'letsencrypt');
        if (!fs.existsSync(letsencryptDir)) {
            console.log(`Creating certs directory at ${letsencryptDir}`)
            fs.mkdirSync(letsencryptDir);
        } else {
            console.log(`Found certs directory at ${letsencryptDir}`)
        }

        const server = GreenlockExpress.create({
            app,

            email: config.letsencryptEmail,
            agreeTos: config.letsencryptAcceptTOS === true,
            approvedDomains: [config.sslDomain],
            configDir: letsencryptDir,

            communityMember: false,
            securityUpdates: false,
            telemetry: true,
        });
        console.log(`Starting GreenlockExpress server on ports http:${config.port} and https:${config.httpsPort}`)
        server.listen(config.port, config.httpsPort, (err) => {
            if (err) return showError(`ERROR: RPNow failed to start: ${err}`);
            console.log('Ready');
        });
    } else {
        console.log(`Starting HTTP server on port ${config.port}`)
        app.listen(config.port, (err) => {
            if (err) return showError(`ERROR: RPNow failed to start: ${err}`);
            console.log('Ready');
        });
    }
}().catch(err => {
    showError(err)
}));
