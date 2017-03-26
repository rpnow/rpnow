const api = require('./api');
api.trustProxy = true;

api.start((err) => {
    if (err) return console.error(err);

    console.log('RPNow API: ready.');

    process.on('SIGTERM', ()=> shutdown('SIGTERM') ); //kill (terminate)
    process.on('SIGINT', ()=> shutdown('SIGINT') ); //Ctrl+C (interrupt)
    function shutdown(reason) {
        console.log(`RPNow API: Attempting graceful shutdown: ${reason}`);
        api.stop((err)=> {
            if (err) console.error(err);
            else console.log('RPNow API: Shutdown complete.');
        });
    }
});
