import http from 'k6/http';
import { sleep, check } from 'k6';

/* =========================================================
   Exp_A_08 | Moderate | Burst | 50 → 500 spike | 5 min
   Workload : 100% Moderate (POST /api/moderate)
   Pattern  : Burst — sudden spike then recovery
   Stages   : 2 min baseline | 30 s spike to 500 | 2.5 min recovery
========================================================= */

const BASE_URL = 'http://localhost:3000';
const EXPERIMENT_ID = 'Exp_A_08';
const SYSTEM_TYPE = 'A';

export const options = {
    scenarios: {
        burst_load: {
            executor: 'ramping-vus',
            startVUs: 50,
            stages: [
                { duration: '2m', target: 50 },  // baseline
                { duration: '30s', target: 500 },  // sudden spike
                { duration: '2m30s', target: 50 },  // recovery
            ],
            tags: { pattern: 'burst' },
        },
    },
};

export default function () {
    const payload = JSON.stringify({});

    const params = {
        headers: {
            'Content-Type': 'application/json',
            'x-system-type': SYSTEM_TYPE,
            'x-traffic-pattern': 'burst',
            'x-workload-type': 'moderate',
            'x-endpoint-group': 'moderate',
            'x-test-tool': 'k6',
            'x-experiment-id': EXPERIMENT_ID,
            'x-concurrent-users': String(__VU),
        },
    };

    const res = http.post(`${BASE_URL}/api/moderate`, payload, params);

    check(res, {
        'status 2xx': (r) => r.status >= 200 && r.status < 300,
    });

    sleep(1);
}