const router = require('express').Router();

const fakeDbQuery = () =>
    new Promise(resolve => {
        const delay = 30 + Math.random() * 50;
        setTimeout(() => resolve({ rows: 42 }), delay);
    });

router.post('/', async (req, res) => {
    const result = await fakeDbQuery();
    res.json({ type: 'moderate', ...result });
});

module.exports = router;