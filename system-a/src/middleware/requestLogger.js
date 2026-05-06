const logger = require('../server/config/logger');

const requestLogger = (req,res,next) => {
    res.on("finish",() => {
        const message = `${req.method} ${req.url} ${res.statusCode}`;
        logger.info(message);
    });
next();
};

module.exports = requestLogger;