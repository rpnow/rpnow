const express = require('express');
const config = require('./services/config');
const apiRoutes = require('./routes/api');
const clientRoutes = require('./routes/serve-client');

const app = express();

app.use('/api', apiRoutes);
app.use('/', clientRoutes);

if (config.trustProxy) {
    app.enable('trust proxy');
}

module.exports = app;
