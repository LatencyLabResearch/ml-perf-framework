const pidusage = require('pidusage');
const config = require('../server/config');

/* ---------- WINDOW CONFIG ---------- */

const WINDOW_MS = 5000;

/* ---------- SLIDING WINDOWS ---------- */

const requestWindow = [];
const latencyWindow = [];
const errorWindow = [];
const cpuWindow = [];

/* ---------- LATEST SYSTEM SNAPSHOT ---------- */

let latestCpu = 0;
let latestMemory = 0;

/* ---------- CLEANUP HELPER ---------- */

function pruneOld(arr) {

    const cutoff = Date.now() - WINDOW_MS;

    while (arr.length && arr[0].ts < cutoff) {
        arr.shift();
    }
}

/* ---------- BACKGROUND METRIC SAMPLER ---------- */

setInterval(async () => {

    try {

        const stats = await pidusage(process.pid);

        latestCpu = +stats.cpu.toFixed(2);

        latestMemory =
            +(stats.memory / 1048576).toFixed(2);

        cpuWindow.push({
            ts: Date.now(),
            value: latestCpu
        });

        pruneOld(cpuWindow);

    } catch (err) {

        console.error('CPU sampler failed:', err);
    }

}, 1000);

/* ---------- MIDDLEWARE ---------- */

module.exports = (req, res, next) => {

    req._arrivalTime = process.hrtime.bigint();

    /* ---------- TRACK REQUEST ---------- */

    requestWindow.push({
        ts: Date.now()
    });

    pruneOld(requestWindow);

    const payloadSize = req.headers['content-length'] ? +(req.headers['content-length'] / 1024).toFixed(2) : 0;

    /* ---------- COMPUTE WINDOW METRICS ---------- */

    const avgLatency =
        latencyWindow.length
            ? latencyWindow.reduce((a, b) => a + b.value, 0)
                / latencyWindow.length
            : 0;

    const avgCpu =
        cpuWindow.length
            ? cpuWindow.reduce((a, b) => a + b.value, 0)
                / cpuWindow.length
            : latestCpu;

    req._metrics = {

        timestamp:               new Date().toISOString(),

        instance_id:             config.instanceId,

        http_method:             req.method,

        endpoint_id:             req.route?.path || req.path,

        endpoint_complexity:     req.headers['x-endpoint-complexity'] || 'unknown',

        payload_size_kb:         payloadSize,

        cpu_utilization_pct:     latestCpu,

        memory_usage_mb:         latestMemory,

        active_connections:      req.socket.server.connections || 0,

        rolling_avg_cpu_5s:      +avgCpu.toFixed(2),

        rolling_avg_latency_5s:  +avgLatency.toFixed(2),

        req_per_sec:             +(requestWindow.length / (WINDOW_MS / 1000)).toFixed(2),

        short_term_error_rate:   requestWindow.length
                                    ? +(
                                        (errorWindow.length / requestWindow.length) * 100
                                    ).toFixed(2)
                                    : 0,

        response_time_ms:        0,

        status_code:             0
    };

    /* ---------- RESPONSE FINISH ---------- */

    res.on('finish', () => {

        const now = Date.now();

        const latency =
            Number(process.hrtime.bigint() - req._arrivalTime) / 1e6;

        latencyWindow.push({
            ts: now,
            value: latency
        });

        pruneOld(latencyWindow);

        if (res.statusCode >= 500) {

            errorWindow.push({
                ts: now
            });

            pruneOld(errorWindow);
        }

        /* ---------- UPDATE RESPONSE METRICS ---------- */

        req._metrics.response_time_ms = +latency.toFixed(2);
        req._metrics.status_code = res.statusCode;
    });

    next();
};
