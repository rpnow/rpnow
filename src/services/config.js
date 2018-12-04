module.exports = {
    port: (+process.env.RPNOW_PORT) || 13000,
    trustProxy: (process.env.RPNOW_TRUST_PROXY || '').toLowerCase() === 'true',
    cors: (process.env.RPNOW_CORS || '').toLowerCase() === 'true',
    logLevel: (process.env.RPNOW_LOG_LEVEL) || 'info',
};
