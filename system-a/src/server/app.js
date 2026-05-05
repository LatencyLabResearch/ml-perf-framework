const express = require('express');

const lightweightRoutes = require('../routes/lightweight');
const moderateRoutes = require('../routes/moderate');
const heavyRoutes = require('../routes/heavy');

const app = express();

app.use(express.json());

app.use('/lightweight', lightweightRoutes);
app.use('/moderate', moderateRoutes);
app.use('/heavy', heavyRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

module.exports = app;