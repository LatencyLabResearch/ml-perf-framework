// const winston = require('winston');
// const path = require("path");

// const logDir = "logs";

// const customFormat = winston.format.printf(({level,message}) => {
//     return `[${level.toUpperCase()}]:${message}`;
// });


// const logger = winston.createLogger({
//     level:'info',
//     format:winston.format.combine(customFormat),
//     transports:[
//        new winston.transports.File({
//         filename: path.join(logDir,"error.log"),
//         level:"error",
//        }),
//        new winston.transports.File({
//         filename:path.join(logDir,"combined.log"),
//        }),
//     ],
// });

// module.exports = logger;


const winston = require('winston');
const path = require('path');
const fs = require('fs');

const config = require('../server/config');

fs.mkdirSync(config.logDir, { recursive: true });

const csvFile = path.join(
    config.logDir,
    `instance-${config.instanceId}.csv`
);

const debugFile = path.join(
    config.logDir,
    `instance-${config.instanceId}.log`
);

/* ---------------- CSV LOGGER ---------------- */

const csvLogger = winston.createLogger({
    format: winston.format.printf(info => info.message),
    transports: [
        new winston.transports.File({
            filename: csvFile
        })
    ]
});

/* ---------------- DEBUG LOGGER ---------------- */

const debugLogger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
            return `[${timestamp}] ${level.toUpperCase()} ${message}`;
        })
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({
            filename: debugFile
        })
    ]
});

/* ---------------- CSV HEADER ---------------- */

if (!fs.existsSync(csvFile)) {
    csvLogger.info([
        'timestamp',
        'instance_id',
        'http_method',
        'endpoint_id',
        'endpoint_complexity',
        'payload_size_kb',
        'cpu_utilization_pct',
        'memory_usage_mb',
        'active_connections',
        'rolling_avg_cpu_5s',
        'rolling_avg_latency_10',
        'req_per_sec',
        'short_term_error_rate',
        'response_time_ms',
        'status_code'
    ].join(','));
}

module.exports = {
    csvLogger,
    debugLogger
};