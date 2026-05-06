const winston = require('winston');
const path = require("path");

const logDir = "logs";

const customFormat = winston.format.printf(({level,message}) => {
    return `[${level.toUpperCase()}]:${message}`;
});


const logger = winston.createLogger({
    level:'info',
    format:winston.format.combine(customFormat),
    transports:[
       new winston.transports.File({
        filename: path.join(logDir,"error.log"),
        level:"error",
       }),
       new winston.transports.File({
        filename:path.join(logDir,"combined.log"),
       }),
    ],
});

module.exports = logger;