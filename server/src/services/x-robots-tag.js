module.exports = (req, res, next) => {
    res.set('X-Robots-Tag', 'noindex');
    next();
};
