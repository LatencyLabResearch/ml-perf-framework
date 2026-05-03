require('dotenv').config();

module.exports = {
    port: parseInt(process.env.PORT) || 3000,
    instanceId: parseInt(process.env.INSTANCE_ID) || 1,
    numInstances: parseInt(process.env.NUM_INSTANCES) || 3,
    logDir: process.env.LOG_DIR || './logging/raw',
    env: process.env.NODE_ENV || 'development',

    // Endpoint complexity scores — used as ML features
    complexity: { light: 1, moderate: 5, heavy: 9 }
};