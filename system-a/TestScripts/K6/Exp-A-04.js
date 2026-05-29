import http from 'k6/http';
import { sleep, check } from 'k6';

/* =========================================================
   Exp_A_04 | Lightweight | Peak | 50 → 300 VUs | 10 min
   Workload : 100% Lightweight (GET /api/light)
   Pattern  : Peak — ramp up to 300, hold, ramp down
   Stages   : 3 min ramp-up | 4 min hold | 3 min ramp-down
========================================================= */

const BASE_URL = 'http://localhost:3000';
const EXPERIMENT_ID = 'Exp_A_04';
const SYSTEM_TYPE = 'A';

export const options = {
    scenarios: {
        peak_load: {
            executor: 'ramping-vus',
            startVUs: 50,
            stages: [
                { duration: '3m', target: 300 },  // ramp up to peak
                { duration: '4m', target: 300 },  // hold at peak
                { duration: '3m', target: 50 },  // ramp back down
            ],
            tags: { pattern: 'peak' },
        },
    },
};

export default function () {
    const params = {
        headers: {
            'Content-Type': 'application/json',
            'x-system-type': SYSTEM_TYPE,
            'x-traffic-pattern': 'peak',
            'x-workload-type': 'lightweight',
            'x-endpoint-group': 'light',
            'x-test-tool': 'k6',
            'x-experiment-id': EXPERIMENT_ID,
            'x-concurrent-users': String(__VU),
        },
    };

    const res = http.get(`${BASE_URL}/api/light`, params);

    check(res, {
        'status 2xx': (r) => r.status >= 200 && r.status < 300,
    });

    sleep(1);
}