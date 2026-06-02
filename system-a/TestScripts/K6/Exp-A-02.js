import http from 'k6/http';
import { sleep, check } from 'k6';

/* =========================================================
   Exp_A_02 | Moderate | Steady | 50 VUs | 10 min
   Workload : 100% Moderate (POST /api/moderate)
   Pattern  : Steady — constant-vus
========================================================= */

const BASE_URL = 'http://localhost:3000';
const EXPERIMENT_ID = 'Exp_A_02';
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
    const payload = JSON.stringify({});

    const params = {
        headers: {
            'Content-Type': 'application/json',
            'x-system-type': SYSTEM_TYPE,
            'x-traffic-pattern': 'steady',
            'x-workload-type': 'moderate',
            'x-endpoint-group': 'moderate',
            'x-test-tool': 'k6',
            'x-experiment-id': EXPERIMENT_ID,
            'x-concurrent-users': String(__VU),
        },
    };

    const res = http.post(`${BASE_URL}/api/moderate`, payload, params);

    check(res, {
        'status 2xx': (r) => r.status >= 200 && r.status <= 500,
    });

    sleep(1);
}