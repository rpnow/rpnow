const express = require('express');
const apiRoutes = require('./routes/api');
const clientRoutes = require('./routes/serve-client');
const graphqlRoutes = require('./routes/graphql');

const app = express();

app.use('/api', apiRoutes);
app.use(graphqlRoutes);
app.use(clientRoutes);

module.exports = app;
