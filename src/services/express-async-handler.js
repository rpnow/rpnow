module.exports = {
    awrap(fn) {
        return function asyncWrapper(...args) {
            const next = args[args.length - 1];
            return fn(...args).catch(next);
        }
    }
};