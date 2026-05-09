const express = require('express');

// Import Routes
const lightweightRoutes = require('../routes/lightweight');
const moderateRoutes = require('../routes/moderate');
const heavyRoutes = require('../routes/heavy');


// Import Middlewares
const requestLogger = require('../middleware/requestLogger');
const metricsCollector = require('../middleware/metricsCollector');

const app = express();

// Parse JSON bodies
app.use(express.json({ limit: '1mb' }));


// Metrics Collector - MUST come FIRST
app.use(metricsCollector);

// Request Logger
app.use(requestLogger);

// Routes

app.use('/api/light', lightweightRoutes);
app.use('/api/moderate', moderateRoutes);
app.use('/api/heavy', heavyRoutes);

app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        instance: require('./config').instanceId 
    });
});


app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

module.exports = app;