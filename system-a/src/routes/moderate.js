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
  try {
    const payload = JSON.stringify(req.body || {});

    createRequest(payload);

    const result = getRequestCount();

    res.json({ type: 'moderate', count: result.cnt, });
  } catch (error) {
    console.error(error);
    
    res.status(500).json({
      error: 'Database error',
    });
  }
});

module.exports = router;