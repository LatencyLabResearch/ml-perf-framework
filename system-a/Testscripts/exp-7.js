import http from 'k6/http';
import { sleep, check } from 'k6';

const folder = 'testscripts/results';
const expId = 'Exp_A_07';

export const options = {
    stages: [
        { duration: '1m', target: 50 },
        { duration: '30s', target: 500 },
        { duration: '2m', target: 500 },
        { duration: '1m30s', target: 0 },
    ],
    thresholds: {
        http_req_duration: ['p(95)<500'],
        http_req_failed: ['rate<0.05'],
    },
};

export default function () {
    const headers = {
        'Content-Type': 'application/json',
        'x-system-type': 'system-a',
        'x-traffic-pattern': 'burst',
        'x-workload-type': 'isolated',
        'x-endpoint-group': 'lightweight',
        'x-test-tool': 'k6',
        'x-experiment-id': 'Exp_A_07',
        'x-concurrent-users': String(__VU),
    };

    const response = http.get('http://localhost:3000/api/light', { headers });

    check(response, {
        'status is 200': (r) => r.status === 200,
        'response time <500ms': (r) => r.timings.duration < 500,
    });

    sleep(1);
}