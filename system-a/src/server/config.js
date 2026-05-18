require('dotenv').config();

module.exports = {
    instances: [
        { id: '1', url: 'http://localhost:3001' },
        { id: '2', url: 'http://localhost:3002' },
        { id: '3', url: 'http://localhost:3003' }
    ],

    lbPort: parseInt(process.env.LB_PORT) || 3000,
    port: parseInt(process.env.PORT) || 3001,
    instanceId: parseInt(process.env.INSTANCE_ID) || 1,
    numInstances: parseInt(process.env.NUM_INSTANCES) || 3,
    logDir: process.env.LOG_DIR || './logging/raw',
    env: process.env.NODE_ENV || 'development',

    // Endpoint complexity scores — used as ML features
    complexity: { light: 1, moderate: 5, heavy: 9 }
};