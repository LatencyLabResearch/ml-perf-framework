const router = require('express').Router();

router.get('/', (req, res) => {
    res.json({ type: 'light', ts: Date.now() });
});

module.exports = router;