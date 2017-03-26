const api = require('./api');
api.trustProxy = true;

api.start((err) => {
    console.error(err || 'RPNow API: ready.');
});

process.on('SIGTERM', ()=> shutdown('SIGTERM') ); //kill (terminate)
process.on('SIGINT', ()=> shutdown('SIGINT') ); //Ctrl+C (interrupt)
function shutdown(reason) {
    console.log(`RPNow API: Attempting graceful shutdown: ${reason}`);
    api.stop((err)=> console.log(err || 'RPNow API: Shutdown complete.') );
}