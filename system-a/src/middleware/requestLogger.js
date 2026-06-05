const fs = require('fs');
const path = require('path');

const { csvLogger, debugLogger } = require('../config/logger');

/* =========================================================
   CSV SAFETY HELPERS
========================================================= */

function escapeCSV(value) {

    if (value === null || value === undefined) {
        return '';
    }

    const str = String(value);

    if (
        str.includes(',') ||
        str.includes('"') ||
        str.includes('\n')
    ) {
        return `"${str.replace(/"/g, '""')}"`;
    }

    return str;
}

/* =========================================================
   STRICT COLUMN ORDER (DO NOT CHANGE)
========================================================= */

function buildRow(m, e) {

    return [

        /* ---------- CORE IDENTITY ---------- */

        m.request_id,
        m.timestamp,
        m.instance_id,

        /* ---------- EXPERIMENT METADATA ---------- */

        e.system_type,
        e.traffic_pattern,
        e.workload_type,
        e.endpoint_group,
        e.test_tool,
        e.experiment_id,
        e.concurrent_users,

        /* ---------- REQUEST INFO ---------- */

        m.http_method,
        m.endpoint_id,
        m.endpoint_complexity,
        m.payload_size_kb,

        /* ---------- SYSTEM METRICS ---------- */

        m.cpu_utilization_pct,
        m.memory_usage_mb,
        m.active_connections,
        m.event_loop_lag_ms,

        /* ---------- ROLLING METRICS ---------- */

        m.rolling_avg_cpu_5s,
        m.rolling_avg_latency_5s,
        m.p95_latency_5s,
        m.p99_latency_5s,

        /* ---------- THROUGHPUT ---------- */

        m.req_per_sec,

        /* ---------- ERRORS ---------- */

        m.short_term_error_rate,

        /* ---------- RESPONSE ---------- */

        m.response_time_ms,
        m.status_code
    ];
}

/* =========================================================
   MAIN LOGGER
========================================================= */

const requestLogger = (req, res, next) => {

    res.on('finish', () => {

        try {

            const m = req._metrics || {};
            const e = req._experiment || {};

            /* =====================================================
               CSV OUTPUT (ML DATASET)
            ===================================================== */

            const row = buildRow(m, e)
                .map(escapeCSV)
                .join(',');

            csvLogger.info(row);

            /* =====================================================
               HUMAN DEBUG LOG
            ===================================================== */

            debugLogger.info(

                `[${e.experiment_id || 'EXP-NA'}] ` +
                `[System:${e.system_type || 'A'}] ` +
                `${m.http_method || req.method} ` +
                `${m.endpoint_id || req.originalUrl} | ` +

                `Status=${m.status_code || res.statusCode} | ` +
                `Latency=${m.response_time_ms || 0}ms | ` +
                `CPU=${m.cpu_utilization_pct || 0}% | ` +
                `MEM=${m.memory_usage_mb || 0}MB | ` +
                `Conn=${m.active_connections || 0} | ` +
                `Users=${e.concurrent_users || 0} | ` +
                `Pattern=${e.traffic_pattern || 'unknown'} | ` +
                `Tool=${e.test_tool || 'unknown'}`
            );

        } catch (err) {

            console.error(
                'Request logging failed:',
                err
            );
        }
    });

    next();
};

module.exports = requestLogger;