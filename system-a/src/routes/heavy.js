const router = require('express').Router();

const MAX_CONCURRENT = 50;
let activeHeavy = 0;

function fib(n) {
    return n <= 1 ? n : fib(n - 1) + fib(n - 2);
}

router.post('/', (req, res) => {

    if (activeHeavy >= MAX_CONCURRENT) {
        return res.status(503).json({
            error: 'Server busy — too many heavy requests',
            active: activeHeavy,
            limit: MAX_CONCURRENT
        });
    }

    const parsedN = parseInt(req.body?.n, 10);
    const n = Math.max(0, Math.min(Number.isNaN(parsedN) ? 36 : parsedN, 40));

    activeHeavy++;

    setImmediate(() => {
        try {
            const result = fib(n);
            activeHeavy--;
            res.json({ type: 'heavy', result });
        } catch (err) {
            activeHeavy--;
            console.error('[heavy] fib error:', err.message);
            res.status(500).json({ error: 'Computation failed' });
        }
    });
});

module.exports = router;