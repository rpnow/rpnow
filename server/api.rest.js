const bodyParser = require('body-parser');

const model = require('./model');

let router = require('express').Router();
router.use(require('compression')());
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));

router.post('rp', (req, res, next) => {
    let roomOptions = req.body;
    console.log(roomOptions);
    model.createRp(roomOptions, (err, rpCode) => {
        if (err) return next(err);
        res.status(201).json({ rpCode: rpCode });
    });
})

router.all('*', (req, res, next) => {
    next({ code: 'UNKNOWN_REQUEST'});
})

router.use((err, req, res, next) => {
    res.status(400).json({ error: err });
});

module.exports = router;