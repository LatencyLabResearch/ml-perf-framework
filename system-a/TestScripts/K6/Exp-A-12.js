import http from 'k6/http';
import { sleep, check } from 'k6';

/* =========================================================
   Exp_A_12 | All Endpoints | Burst | 100 → 1000 spike | 5 min
   Workload : Combined  L:60% / M:30% / H:10%
   Pattern  : Burst — sudden spike then recovery
   Stages   : 2 min baseline | 30 s spike to 1000 | 2.5 min recovery
========================================================= */

const BASE_URL = 'http://localhost:3000';
const EXPERIMENT_ID = 'Exp_A_12';
const SYSTEM_TYPE = 'A';

export const options = {
    scenarios: {
        burst_load: {
            executor: 'ramping-vus',
            startVUs: 100,
            stages: [
                { duration: '2m', target: 100 },  // baseline
                { duration: '30s', target: 1000 },  // sudden spike
                { duration: '2m30s', target: 100 },  // recovery
            ],
            tags: { pattern: 'burst' },
        },
    },
};

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
            'x-traffic-pattern': 'burst',
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

    sleep(1);
}
