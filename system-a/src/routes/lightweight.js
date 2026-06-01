const router = require('express').Router();

router.get('/', (req, res) => {
    try {
        res.json({ type: 'light', ts: Date.now() });
    } catch (err) {
        console.error('[light] response error:', err.message);
        res.status(500).json({ error: 'Response failed' });
    }
});

module.exports = router;