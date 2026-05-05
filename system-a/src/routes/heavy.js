const router = require('express').Router();

function fib(n) {
    return n <= 1 ? n : fib(n - 1) + fib(n - 2);
}

router.post('/', (req, res) => {
    const parsedN = parseInt(req.body?.n, 10);
    const n = Math.max(0, Math.min(Number.isNaN(parsedN) ? 36 : parsedN, 40));
    res.json({ type: 'heavy', result: fib(n) });
});

module.exports = router;