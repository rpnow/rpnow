const express = require('express');
const addWs = require('express-ws');
const app = express();
addWs(app); // must come before routes are loaded!

const apiRoutes = require('./routes/api');
const clientRoutes = require('./routes/serve-client');

app.use('/api', apiRoutes);
app.use('/', clientRoutes);

module.exports = app;
