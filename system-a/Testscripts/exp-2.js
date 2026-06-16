import http from 'k6/http';
import { sleep, check } from 'k6';


export const options = {
    vus: 50,
    duration: '10m',
    thresholds: {
        http_req_duration: ['p(95)<500'],
        http_req_failed: ['rate<0.01'],
    },
};

export default function () {
    const headers = {
        'Content-Type': 'application/json',
        'x-system-type': 'system-a',
        'x-traffic-pattern': 'steady',
        'x-workload-type': 'isolated',
        'x-endpoint-group': 'moderate',    // ← changed to moderate
        'x-test-tool': 'k6',
        'x-experiment-id': 'Exp_A_02',    // ← changed
        'x-concurrent-users': String(__VU),
    };

    const response=http.post(
        'http://localhost:3000/api/moderate',
        JSON.stringify({}),// body — can be your actual payload
        {headers}
    );
    
    check(response, {
        'status is 200': (r) => r.status === 200,
        'response time < 500ms': (r) => r.timings.duration < 500,
    });

    sleep(1);
}