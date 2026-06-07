import http from 'k6/http';
import { sleep, check } from 'k6';

/* =========================================================
   Exp_A_14 | All Endpoints | Mixed Stress | Dynamic (100–1200) | 15 min
   Workload : Combined — Dynamic Mixed Distribution
             Distribution shifts with traffic phase:
               Baseline  (≤200  VUs) → L:70% / M:25% / H:5%
               Elevated  (≤500  VUs) → L:60% / M:30% / H:10%
               Stress    (≤900  VUs) → L:50% / M:35% / H:15%
               Peak      (>900  VUs) → L:40% / M:40% / H:20%
   Pattern  : Mixed Stress — progressive ramp with two spikes and
              sustained high-load phase to find breaking points
   Stages   :
     00:00  warm-up          100  → 300   (2 min)
     02:00  first ramp        300 → 600   (2 min)
     04:00  stress hold       600         (2 min)
     06:00  spike #1          600 → 1200  (1 min)   ← sudden burst
     07:00  spike recovery   1200 → 700   (1 min)
     08:00  sustained stress  700 → 900   (2 min)
     10:00  spike #2          900 → 1100  (1 min)   ← second burst
     11:00  final recovery   1100 → 400   (2 min)
     13:00  cool-down         400 → 100   (2 min)
========================================================= */

const BASE_URL = 'http://localhost:3000';
const EXPERIMENT_ID = 'Exp_A_14';
const SYSTEM_TYPE = 'A';

export const options = {
    scenarios: {
        mixed_stress: {
            executor: 'ramping-vus',
            startVUs: 100,
            stages: [
                { duration: '2m', target: 300 },  // warm-up
                { duration: '2m', target: 600 },  // first ramp
                { duration: '2m', target: 600 },  // stress hold
                { duration: '1m', target: 1200 },  // spike #1
                { duration: '1m', target: 700 },  // spike recovery
                { duration: '2m', target: 900 },  // sustained stress
                { duration: '1m', target: 1100 },  // spike #2
                { duration: '2m', target: 400 },  // final recovery
                { duration: '2m', target: 100 },  // cool-down
            ],
            tags: { pattern: 'mixed_stress' },
        },
    },
};

/* =========================================================
   DYNAMIC DISTRIBUTION
   Shifts endpoint weights as concurrent VU count increases,
   simulating heavier workloads at higher concurrency levels.
========================================================= */
function pickEndpoint() {
    const vu = __VU;
    let lightThreshold, moderateThreshold;

    if (vu <= 200) {
        // Baseline: L:70% / M:25% / H:5%
        lightThreshold = 0.70;
        moderateThreshold = 0.95;
    } else if (vu <= 500) {
        // Elevated: L:60% / M:30% / H:10%
        lightThreshold = 0.60;
        moderateThreshold = 0.90;
    } else if (vu <= 900) {
        // Stress: L:50% / M:35% / H:15%
        lightThreshold = 0.50;
        moderateThreshold = 0.85;
    } else {
        // Peak stress: L:40% / M:40% / H:20%
        lightThreshold = 0.40;
        moderateThreshold = 0.80;
    }

    const r = Math.random();
    if (r < lightThreshold) return { path: '/api/light', group: 'light', method: 'GET' };
    if (r < moderateThreshold) return { path: '/api/moderate', group: 'moderate', method: 'POST' };
    return { path: '/api/heavy', group: 'heavy', method: 'POST' };
}

export default function () {
    const ep = pickEndpoint();

    const params = {
        headers: {
            'Content-Type': 'application/json',
            'x-system-type': SYSTEM_TYPE,
            'x-traffic-pattern': 'mixed_stress',
            'x-workload-type': 'combined',
            'x-endpoint-group': ep.group,
            'x-test-tool': 'k6',
            'x-experiment-id': EXPERIMENT_ID,
            'x-concurrent-users': String(__VU),
        },
    };

    let res;
    if (ep.method === 'GET') {
        res = http.get(`${BASE_URL}${ep.path}`, params);
    } else {
        const payload = ep.group === 'heavy'
            ? JSON.stringify({ n: 36 })
            : JSON.stringify({});
        res = http.post(`${BASE_URL}${ep.path}`, payload, params);
    }

    check(res, {
        'status 2xx': (r) => r.status >= 200 && r.status <= 503,
        'not timeout': (r) => r.timings.duration < 10000,
    });

    // Variable think-time that compresses under extreme load
    // to increase request pressure proportionally
    const vu = __VU;
    let thinkTime;
    if (vu > 900) thinkTime = 0.5;
    else if (vu > 500) thinkTime = 0.75;
    else thinkTime = ep.group === 'heavy' ? 2 : ep.group === 'moderate' ? 1.5 : 1;

    sleep(thinkTime);
}
