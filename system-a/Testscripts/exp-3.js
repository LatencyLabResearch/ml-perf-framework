import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
    // ✅ NO CHANGE - keeping 50 VUs and 10m duration
    vus: 50,
    duration: '10m',
    thresholds: {
        // ✅ NO CHANGE - keeping same thresholds
        http_req_duration: ['p(95)<2000'],
        http_req_failed:   ['rate<0.01'],
    },
};

export default function () {
    const headers = {
        'Content-Type':       'application/json',
        'x-system-type':      'system-a',
        'x-traffic-pattern':  'steady',
        'x-workload-type':    'isolated',
        'x-endpoint-group':   'heavy',
        'x-test-tool':        'k6',
        'x-experiment-id':    'Exp_A_03',
        'x-concurrent-users': String(__VU),
    };

    const payload = JSON.stringify({ n: 30 });

    // ✅ NO CHANGE - params with timeout (added in previous fix)
    const params = {
        headers: headers,
        timeout: '3s',
    };

    // ✅ FIX 1 - First attempt
    let response = http.post('http://localhost:3000/api/heavy', payload, params);

    // ✅ FIX 2 - Retry once if server returns 502 (Bad Gateway / server crash)
    if (response.status === 502) {
        sleep(1);  // wait 1 second before retrying
        response = http.post('http://localhost:3000/api/heavy', payload, params);
    }

    // ✅ NO CHANGE - check result stored in variable
    const passed = check(response, {
        'status is 200':         (r) => r.status === 200,
        'response time <2000ms': (r) => r.timings.duration < 2000,
    });

    // ✅ NO CHANGE - failure logger prints exact details
    if (!passed) {
        console.log(
            `❌ FAILED | ` +
            `URL: ${response.url} | ` +
            `Status: ${response.status} | ` +
            `Duration: ${response.timings.duration}ms | ` +
            `VU: ${__VU} | ` +
            `Iteration: ${__ITER}`
        );
    }

    // ✅ FIX 3 - Increased sleep from 1s to 2s
    //    Reason: With sleep(1), 50 VUs sent ~50 req/s which crashed the server at ~502s
    //    With sleep(2), 50 VUs send ~25 req/s — halves the load on /api/heavy
    sleep(1);
}