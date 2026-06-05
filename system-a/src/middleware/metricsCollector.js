const pidusage = require('pidusage');
const crypto = require('crypto');
const config = require('../server/config');

/* ---------- WINDOW CONFIG ---------- */

const WINDOW_MS = 5000;

/* ---------- SLIDING WINDOWS ---------- */

const requestWindow = [];
const latencyWindow = [];
const errorWindow = [];
const cpuWindow = [];

/* ----------  ACTIVE CONNECTION TRACKING ---------- */

let activeConnections = 0;

/* ---------- LATEST SYSTEM SNAPSHOT ---------- */

let latestCpu = 0;
let latestMemory = 0;
let latestEventLoopLag = 0;

/* ----------  HELPERS ---------- */

function pruneOld(arr) {

    const cutoff = Date.now() - WINDOW_MS;

    while (arr.length && arr[0].ts < cutoff) {
        arr.shift();
    }
}

function percentile(values, p) {

    if (!values.length) return 0;

    const sorted = [...values].sort((a, b) => a - b);

    const index =
        Math.ceil((p / 100) * sorted.length) - 1;

    return sorted[index] || 0;
}

function normalizeEndpoint(url) {

    return url
        .replace(/\/\d+/g, '/:id')
        .replace(
            /[0-9a-fA-F-]{36}/g,
            ':uuid'
        );
}

/* ---------- BACKGROUND METRIC SAMPLER ---------- */

setInterval(async () => {

    try {

        /* ---------- CPU + MEMORY ---------- */

        const stats =
            await pidusage(process.pid);

        latestCpu =
            +stats.cpu.toFixed(2);

        latestMemory =
            +(stats.memory / 1048576).toFixed(2);

        cpuWindow.push({
            ts: Date.now(),
            value: latestCpu
        });

        pruneOld(cpuWindow);

        /* ---------- EVENT LOOP LAG ---------- */

        const start =
            process.hrtime.bigint();

        setImmediate(() => {

            latestEventLoopLag =
                +(
                    Number(
                        process.hrtime.bigint() - start
                    ) / 1e6
                ).toFixed(2);
        });

    } catch (err) {

        console.error('Metric sampler failed:', err);
    }

}, 1000);

/* ---------- ENDPOINT CLASSIFICATION ---------- */

function classifyEndpoint(path) {

    if (!path) return 'unknown';

    if (path.includes('/light')) {
        return 'light';
    }

    if (path.includes('/moderate')) {
        return 'moderate';
    }

    if (path.includes('/heavy')) {
        return 'heavy';
    }

    return 'unknown';
}

/* ---------- MAIN MIDDLEWARE ---------- */

module.exports = (req, res, next) => {

    const requestStart = process.hrtime.bigint();

    const now = Date.now();

    /* ---------- ACTIVE CONNECTIONS---------- */

    activeConnections++;

    /* ---------- REQUEST WINDOW---------- */

    requestWindow.push({
        ts: now
    });

    pruneOld(requestWindow);

    /* ---------- REQUEST PAYLOAD ---------- */

    const payloadSize =
        req.headers['content-length']
            ? +(
                req.headers['content-length'] / 1024
            ).toFixed(2)
            : 0;

    /* ---------- EXPERIMENT METADATA---------- */

    req._experiment = {

        system_type:
            req.headers['x-system-type'] || 'A',

        traffic_pattern:
            req.headers['x-traffic-pattern']
            || 'unknown',

        workload_type:
            req.headers['x-workload-type']
            || 'unknown',

        endpoint_group:
            req.headers['x-endpoint-group']
            || 'unknown',

        test_tool:
            req.headers['x-test-tool']
            || 'unknown',

        experiment_id:
            req.headers['x-experiment-id']
            || 'unknown',

        concurrent_users:
            Number(
                req.headers[
                'x-concurrent-users'
                ]
            ) || 0
    };

    /* ---------- WINDOW CALCULATION---------- */

    const latencyValues =
        latencyWindow.map(l => l.value);

    const avgLatency =
        latencyValues.length
            ? latencyValues.reduce(
                (a, b) => a + b,
                0
            ) / latencyValues.length
            : 0;

    const avgCpu =
        cpuWindow.length
            ? cpuWindow.reduce(
                (a, b) => a + b.value,
                0
            ) / cpuWindow.length
            : latestCpu;

    const p95Latency =
        percentile(latencyValues, 95);

    const p99Latency =
        percentile(latencyValues, 99);

    /* ---------- ENDPOINT INFO---------- */

    const endpointId =
        normalizeEndpoint(
            req.route?.path || req.path
        );

    const endpointComplexity =
        classifyEndpoint(endpointId);

    /* ---------- REQUEST METRICS OBJECT---------- */

    req._metrics = {

        request_id:
            crypto.randomUUID(),

        timestamp:
            new Date().toISOString(),

        instance_id:
            config.instanceId,

        http_method:
            req.method,

        endpoint_id:
            endpointId,

        endpoint_complexity:
            endpointComplexity,

        payload_size_kb:
            payloadSize,

        cpu_utilization_pct:
            latestCpu,

        memory_usage_mb:
            latestMemory,

        active_connections:
            activeConnections,

        event_loop_lag_ms:
            latestEventLoopLag,

        rolling_avg_cpu_5s:
            +avgCpu.toFixed(2),

        rolling_avg_latency_5s:
            +avgLatency.toFixed(2),

        p95_latency_5s:
            +p95Latency.toFixed(2),

        p99_latency_5s:
            +p99Latency.toFixed(2),

        req_per_sec:
            +(
                requestWindow.length /
                (WINDOW_MS / 1000)
            ).toFixed(2),

        short_term_error_rate:
            requestWindow.length
                ? +(
                    (
                        errorWindow.length /
                        requestWindow.length
                    ) * 100
                ).toFixed(2)
                : 0,

        response_time_ms: 0,

        status_code: 0
    };

    /* ---------- RESPONSE FINISH ---------- */

    res.on('finish', () => {

        try {

            const finishTime =
                Date.now();

            const latency =
                Number(
                    process.hrtime.bigint()
                    - requestStart
                ) / 1e6;

            /* ---------- LATENCY WINDOW ---------- */

            latencyWindow.push({
                ts: finishTime,
                value: latency
            });

            pruneOld(latencyWindow);

            /* ---------- ERROR WINDOW ---------- */

        if (res.statusCode >= 500) {

            errorWindow.push({
                ts: finishTime
            });

            pruneOld(errorWindow);
        }

            /* ---------- FINAL METRICS ---------- */

        req._metrics.response_time_ms = +latency.toFixed(2);
        req._metrics.status_code = res.statusCode;

        } finally {

            activeConnections--;
        }
    });

    next();
};