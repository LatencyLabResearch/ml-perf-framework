import http from 'k6/http';
import { sleep, check } from 'k6';

/* =========================================================
   Exp_A_10 | All Endpoints | Steady | 100 VUs | 10 min
   Workload : Combined  L:60% / M:30% / H:10%
   Pattern  : Steady — constant-vus
========================================================= */

const BASE_URL = 'http://localhost:3000';
const EXPERIMENT_ID = 'Exp_A_10';
const SYSTEM_TYPE = 'A';

export const options = {
    scenarios: {
        steady_load: {
            executor: 'constant-vus',
            vus: 100,
            duration: '10m',
            tags: { pattern: 'steady' },
        },
    },
};

/* =========================================================
   WEIGHTED ENDPOINT SELECTOR
   rand < 0.60  → light   (60 %)
   rand < 0.90  → moderate(30 %)
   else         → heavy   (10 %)
========================================================= */
function pickEndpoint() {
    const r = Math.random();
    if (r < 0.60) return { path: '/api/light', group: 'light', method: 'GET' };
    if (r < 0.90) return { path: '/api/moderate', group: 'moderate', method: 'POST' };
    return { path: '/api/heavy', group: 'heavy', method: 'POST' };
}

export default function () {
    const ep = pickEndpoint();

    const params = {
        headers: {
            'Content-Type': 'application/json',
            'x-system-type': SYSTEM_TYPE,
            'x-traffic-pattern': 'steady',
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
        'status 2xx': (r) => r.status >= 200 && r.status < 300,
    });

    sleep(1);
}
