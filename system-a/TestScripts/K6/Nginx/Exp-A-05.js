import http from 'k6/http';
import { sleep, check } from 'k6';

/* =========================================================
   Exp_A_05 | Moderate | Peak | 50 → 300 VUs | 10 min
   Workload : 100% Moderate (POST /api/moderate)
   Pattern  : Peak — ramp up to 300, hold, ramp down
   Stages   : 3 min ramp-up | 4 min hold | 3 min ramp-down
========================================================= */

const BASE_URL = 'http://localhost:8080';
const EXPERIMENT_ID = 'Exp_A_05';
const SYSTEM_TYPE = 'A';

export const options = {
    scenarios: {
        peak_load: {
            executor: 'ramping-vus',
            startVUs: 50,
            stages: [
                { duration: '3m', target: 300 },
                { duration: '4m', target: 300 },
                { duration: '3m', target: 50 },
            ],
            tags: { pattern: 'peak' },
        },
    },
};

export default function () {
    const payload = JSON.stringify({});

    const params = {
        headers: {
            'Content-Type': 'application/json',
            'x-system-type': SYSTEM_TYPE,
            'x-traffic-pattern': 'peak',
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