const express = require('express');

const lightweightRoutes = require('../routes/lightweight');
const moderateRoutes = require('../routes/moderate');
const heavyRoutes = require('../routes/heavy');

const requestLogger = require('../middleware/requestLogger');
const userRoutes = require('../routes/userRoutes');

const app = express();

app.use(express.json());

app.use(requestLogger);
app.use('/api/users', userRoutes);

app.use('/lightweight', lightweightRoutes);
app.use('/moderate', moderateRoutes);
app.use('/heavy', heavyRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

module.exports = app;