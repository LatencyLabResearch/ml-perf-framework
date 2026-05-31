import http from 'k6/http';
import { sleep, check } from 'k6';

/* =========================================================
   Exp_A_03 | Heavy | Steady | 50 VUs | 10 min
   Workload : 100% Heavy (POST /api/heavy)
   Pattern  : Steady — constant-vus
   Runtime Variation : n = 1..30 (random per request)
========================================================= */

const BASE_URL = 'http://localhost:3000';
const EXPERIMENT_ID = 'Exp_A_03_runtime_n_1_to_30';
const SYSTEM_TYPE = 'A';

export const options = {
    scenarios: {
        steady_load: {
            executor: 'constant-vus',
            vus: 50,
            duration: '10m',
            tags: { pattern: 'steady' },
        },
    },
};

export default function () {
    // Random n between 1 and 30
    const n = Math.floor(Math.random() * 30) + 1;

    const payload = JSON.stringify({
        n: n,
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
            'x-system-type': SYSTEM_TYPE,
            'x-traffic-pattern': 'steady',
            'x-workload-type': 'heavy',
            'x-endpoint-group': 'heavy',
            'x-test-tool': 'k6',
            'x-experiment-id': EXPERIMENT_ID,
            'x-concurrent-users': String(__VU),
            'x-payload-n': String(n),
        },
    };

    const res = http.post(
        `${BASE_URL}/api/heavy`,
        payload,
        params
    );

    check(res, {
        'status 2xx': (r) => r.status >= 200 && r.status < 300,
    });

    sleep(1);
}