// const logger = require('../server/config/logger');

// const requestLogger = (req,res,next) => {
//     res.on("finish",() => {
//         const message = `${req.method} ${req.url} ${res.statusCode}`;
//         logger.info(message);
//     });
// next();
// };

// module.exports = requestLogger;





const { csvLogger, debugLogger } = require('../config/logger');

const config = require('../server/config');

const EP_MAP = { light: 0, moderate: 1, heavy: 2 };

const requestLogger = (req, res, next) => {

    res.on('finish', () => {

        try {

            const ms = Number(process.hrtime.bigint() - req._arrivalTime) / 1e6;

            const ep = req.path.split('/').pop();

            const m = req._metrics || {};

            const kb = +((req.headers['content-length'] || 0) / 1024).toFixed(3);

            /* ---------- CSV DATASET LOG ---------- */

            csvLogger.info([
                Date.now(),
                m.instance_id ?? config.instanceId,
                req.method === 'POST' ? 1 : 0,
                EP_MAP[ep] ?? 0,
                config.complexity[ep] ?? 1,
                kb,
                m.cpu_utilization_pct ?? 0,
                m.memory_usage_mb ?? 0,
                m.active_connections ?? 0,
                m.rolling_avg_cpu_5s ?? 0,
                m.rolling_avg_latency_10 ?? 0,
                m.req_per_sec ?? 0,
                m.short_term_error_rate ?? 0,
                +ms.toFixed(3),
                res.statusCode
            ].join(','));

            /* ---------- HUMAN DEBUG LOG ---------- */

            debugLogger.info(
                `[Instance ${m.instance_id}] ` +
                `${req.method} ${req.originalUrl} | ` +
                `Status=${res.statusCode} | ` +
                `Latency=${ms.toFixed(2)}ms | ` +
                `CPU=${m.cpu_utilization_pct}% | ` +
                `MEM=${m.memory_usage_mb}MB | ` +
                `Conn=${m.active_connections}`
            );

        } catch (err) {
            console.error('Request logging failed:', err);
        }
    });
    next();
};

module.exports = requestLogger;