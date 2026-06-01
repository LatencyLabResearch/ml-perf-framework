const router = require('express').Router();

const { createRequest, getRequestCount } = require('../services/request.service');

// const fakeDbQuery = () =>
//     new Promise(resolve => {
//         const delay = 30 + Math.random() * 50;
//         setTimeout(() => resolve({ rows: 42 }), delay);
//     });

// router.post('/', async (req, res) => {
//     const result = await fakeDbQuery();
//     res.json({ type: 'moderate', ...result });
// });

router.post('/', (req, res) => {

    // Reject non-object bodies early before hitting the DB
    if (req.body !== undefined && typeof req.body !== 'object') {
        return res.status(400).json({ error: 'Invalid JSON body' });
    }

    try {
        const payload = JSON.stringify(req.body || {});

        createRequest(payload);

        const result = getRequestCount();

        res.json({ type: 'moderate', count: result.cnt });

    } catch (err) {
        console.error('[moderate] DB error:', err.message);
        res.status(500).json({ error: 'Database error' });
    }
});

module.exports = router;