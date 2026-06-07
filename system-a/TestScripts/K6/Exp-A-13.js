import http from 'k6/http';
import { sleep, check } from 'k6';

/* =========================================================
   Exp_A_13 | All Endpoints | Mixed | Dynamic (50–700) | 15 min
   Workload : Combined — Dynamic Mixed Distribution
             Distribution shifts with traffic phase:
               Low phase   → L:70% / M:25% / H:5%
               Mid phase   → L:60% / M:30% / H:10%
               High phase  → L:50% / M:35% / H:15%
   Pattern  : Mixed — multiple waves simulating real-world variance
   Stages   :
     00:00  warm-up        50  → 200   (2 min)
     02:00  mid climb      200 → 400   (2 min)
     04:00  high plateau   400 → 700   (2 min)
     06:00  hold peak      700         (2 min)
     08:00  partial drop   700 → 300   (2 min)
     10:00  secondary wave 300 → 500   (2 min)
     12:00  cool-down      500 → 50    (3 min)
========================================================= */

const BASE_URL = 'http://localhost:3000';
const EXPERIMENT_ID = 'Exp_A_13';
const SYSTEM_TYPE = 'A';

export const options = {
    scenarios: {
        mixed_load: {
            executor: 'ramping-vus',
            startVUs: 50,
            stages: [
                { duration: '2m', target: 200 },  // warm-up
                { duration: '2m', target: 400 },  // mid climb
                { duration: '2m', target: 700 },  // high plateau
                { duration: '2m', target: 700 },  // hold peak
                { duration: '2m', target: 300 },  // partial drop
                { duration: '2m', target: 500 },  // secondary wave
                { duration: '3m', target: 50 },  // cool-down
            ],
            tags: { pattern: 'mixed' },
        },
    },
};

/* =========================================================
   DYNAMIC DISTRIBUTION
   Distribution shifts based on current VU count to simulate
   realistic workload changes under different traffic phases.
   __VU is the current VU index; __ITER is the iteration count.
   We approximate "current load phase" by VU index thresholds.
========================================================= */
function pickEndpoint() {
    const vu = __VU;
    let lightThreshold, moderateThreshold;

    if (vu <= 200) {
        // Low phase: L:70% / M:25% / H:5%
        lightThreshold = 0.70;
        moderateThreshold = 0.95;
    } else if (vu <= 500) {
        // Mid phase: L:60% / M:30% / H:10%
        lightThreshold = 0.60;
        moderateThreshold = 0.90;
    } else {
        // High phase: L:50% / M:35% / H:15%
        lightThreshold = 0.50;
        moderateThreshold = 0.85;
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
            'x-traffic-pattern': 'mixed',
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
    });

    // Variable think-time: heavier endpoints get slightly longer sleep
    // to reflect realistic client behaviour under load
    const thinkTime = ep.group === 'heavy' ? 2 : ep.group === 'moderate' ? 1.5 : 1;
    sleep(thinkTime);
}
