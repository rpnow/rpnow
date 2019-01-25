const express = require('express');
const apiRoutes = require('./routes/api');
const clientRoutes = require('./routes/serve-client');

const app = express();

app.use('/api', apiRoutes);
app.use('/', clientRoutes);

module.exports = app;
