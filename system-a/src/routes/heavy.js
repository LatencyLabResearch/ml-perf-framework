const router = require('express').Router();

function fib(n) {
    return n <= 1 ? n : fib(n - 1) + fib(n - 2);
}

router.post('/', (req, res) => {
    const n = Math.min(parseInt(req.body?.n, 10) || 36, 40);
    res.json({ type: 'heavy', result: fib(n) });
});

module.exports = router;