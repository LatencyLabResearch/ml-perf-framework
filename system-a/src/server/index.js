

const logger = require('../config/logger');

// logger.info('server is starting');
// logger.error("something went wrong");

const app = require('./app');
const config = require('./config');

app.listen(config.port, () => {
  console.log(`System A instance ${config.instanceId} listening on port ${config.port}`);
});

