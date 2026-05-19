const pidusage = require('pidusage');
const config   = require('../server/config');

const recentLatencies = [];
const recentCpu       = [];
let   reqCount = 0, errCount = 0;
let   windowStart = Date.now();

module.exports = async (req, res, next) => {
  req._arrivalTime = process.hrtime.bigint();
  const stats = await pidusage(process.pid);
  reqCount++;

  const elapsed = (Date.now() - windowStart) / 1000;
  const payloadSize = req.headers['content-length'] ? +(req.headers['content-length'] / 1024).toFixed(2) : 0;

  req._metrics = {
    timestamp:               new Date().toISOString(),
    instance_id:             config.instanceId,
    http_method:             req.method,
    endpoint_id:             req.route?.path || req.path,
    endpoint_complexity:     req.headers['x-endpoint-complexity'] || 'unknown',
    payload_size_kb:         payloadSize,
    cpu_utilization_pct:     +stats.cpu.toFixed(2),
    memory_usage_mb:         +(stats.memory / 1048576).toFixed(2),
    active_connections:      res.socket?.server?._connections || 0,
    rolling_avg_cpu_5s:
      recentCpu.length
        ? +(recentCpu.reduce((a,b)=>a+b,0)/recentCpu.length).toFixed(2)
        : +stats.cpu.toFixed(2),
    rolling_avg_latency_10:
      recentLatencies.length
        ? +(recentLatencies.reduce((a,b)=>a+b,0)/recentLatencies.length).toFixed(2)
        : 0,
    req_per_sec:             +(reqCount / Math.max(elapsed,1)).toFixed(2),
    short_term_error_rate:   +(errCount / reqCount * 100).toFixed(2)
  };

  recentCpu.push(stats.cpu);
  if (recentCpu.length > 10) recentCpu.shift();

  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - req._arrivalTime) / 1e6;
    req._metrics.response_time_ms = +ms.toFixed(2);
    req._metrics.status_code = res.statusCode;
    
    recentLatencies.push(ms);
    if (recentLatencies.length > 10) recentLatencies.shift();
    if (res.statusCode >= 500) errCount++;
  });

  next();
};
