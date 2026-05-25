const { csvLogger, debugLogger } = require('../config/logger');

const requestLogger = (req, res, next) => {

    res.on('finish', () => {

        try {

            const m = req._metrics || {};

            /* ---------- CSV DATASET LOG ---------- */

            csvLogger.info([

                m.timestamp ?? new Date().toISOString(),

                m.instance_id ?? 'unknown',

                m.http_method ?? req.method,

                m.endpoint_id ?? req.originalUrl,

                m.endpoint_complexity ?? 'unknown',

                m.payload_size_kb ?? 0,

                m.cpu_utilization_pct ?? 0,

                m.memory_usage_mb ?? 0,

                m.active_connections ?? 0,

                m.rolling_avg_cpu_5s ?? 0,

                m.rolling_avg_latency_5s ?? 0,

                m.req_per_sec ?? 0,

                m.short_term_error_rate ?? 0,

                m.response_time_ms ?? 0,

                m.status_code ?? res.statusCode

            ].join(','));

            /* ---------- HUMAN DEBUG LOG ---------- */

            debugLogger.info(

                `[Instance ${m.instance_id ?? 'unknown'}] ` +

                `${m.http_method ?? req.method} ` +

                `${m.endpoint_id ?? req.originalUrl} | ` +

                `Status=${m.status_code ?? res.statusCode} | ` +

                `Latency=${m.response_time_ms ?? 0}ms | ` +

                `CPU=${m.cpu_utilization_pct ?? 0}% | ` +

                `MEM=${m.memory_usage_mb ?? 0}MB | ` +

                `Conn=${m.active_connections ?? 0}`

            );

        } catch (err) {

            console.error('Request logging failed:', err);

        }

    });

    next();
};

module.exports = requestLogger;