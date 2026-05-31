import http from 'k6/http';
import { sleep, check } from 'k6';

/* =========================================================
   Exp_A_03 | Heavy | Steady | 50 VUs | 10 min
   Workload : 100% Heavy (POST /api/heavy)
   Pattern  : Steady — constant-vus
========================================================= */

const BASE_URL = 'http://localhost:8080';
const EXPERIMENT_ID = 'Exp_A_03';
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
    // n=36 is the default in the heavy route; keep it consistent
    const payload = JSON.stringify({ n: 36 });

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
        },
    };

    const res = http.post(`${BASE_URL}/api/heavy`, payload, params);

    check(res, {
        'status 2xx': (r) => r.status >= 200 && r.status < 300,
    });

    sleep(1);
}