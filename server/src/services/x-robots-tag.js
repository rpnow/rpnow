module.exports = (req, res, next) => {
    res.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
    next();
};
