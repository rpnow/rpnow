console.log('Starting RPNow server.');

const server = require('./server/api');

server.start({ trustProxy: true }, (err, server, options) => {
    if (err) return console.error(err);
    console.log(`RPNow is running. (Listening on ${options.ip}:${options.port})`);
});

process.on('SIGTERM', ()=> shutdown('SIGTERM') ); //kill (terminate)
process.on('SIGINT', ()=> shutdown('SIGINT') ); //Ctrl+C (interrupt)
function shutdown(reason) {
    console.log(`Attempting graceful shutdown: ${reason}`);
    server.stop(()=> console.log("Shutdown complete.") );
}