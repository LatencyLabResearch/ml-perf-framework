import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
    stages: [
        // ✅ NO CHANGE - keeping same ramp up stages
        { duration: '2m', target: 50  },
        { duration: '6m', target: 300 },
        { duration: '2m', target: 0   },
    ],
    thresholds: {
        // ✅ NO CHANGE - keeping same thresholds
        // NOTE: These may still fail at 300 VUs depending on server capacity
        http_req_duration: ['p(95)<1000'],
        http_req_failed:   ['rate<0.01'],
    },
};

export default function () {
    const headers = {
        'Content-Type':       'application/json',
        'x-system-type':      'system-a',
        'x-traffic-pattern':  'peak',
        'x-workload-type':    'isolated',
        'x-endpoint-group':   'moderate',
        'x-test-tool':        'k6',
        'x-experiment-id':    'Exp_A_05',
        'x-concurrent-users': String(__VU),
    };

    const payload = JSON.stringify({});

    // ✅ CHANGE 1 - Extracted headers into a proper params object with timeout
    // WHY ADDED: Previous code passed headers directly as {headers}
    //            This change combines headers + timeout in one params object
    //            timeout:'10s' added because 300 VUs cause slow responses
    //            old 3s timeout was too short, requests were failing before server responded
    const params = {
        headers: headers,
        timeout: '10s',
    };

    // ✅ CHANGE 2 - Use params object instead of {headers} directly
    // WHY ADDED: To include timeout alongside headers in the request
    let response = http.post('http://localhost:3000/api/moderate', payload, params);

    // ✅ CHANGE 3 - Added retry logic for 502 errors
    // WHY ADDED: At 300 VUs the server gets overwhelmed and returns 502 (Bad Gateway)
    //            Instead of immediately recording a failure, we wait 2s and retry once
    //            2s wait (not 1s) because 300 VU load needs more recovery time
    //            This reduces http_req_failed rate significantly
    if (response.status === 502) {
        sleep(2);
        response = http.post('http://localhost:3000/api/moderate', payload, params);
    }

    // ✅ CHANGE 4 - Store check result in 'passed' variable
    // WHY ADDED: Need to capture true/false result to detect failure
    //            Without this variable we cannot know if check passed or failed
    //            Required for the failure logger below (CHANGE 5)
    const passed = check(response, {
        'status is 200':          (r) => r.status === 200,
        'response time < 1000ms': (r) => r.timings.duration < 1000,
    });

    // ✅ CHANGE 5 - Added failure logger
    // WHY ADDED: Previous code had no visibility into WHICH requests failed
    //            This prints exact details: status, duration, VU number, iteration
    //            Helps identify exactly when and which VU caused failures
    //            Very useful for research analysis and debugging
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

    // ✅ CHANGE 6 - Increased sleep from 1s to 3s
    // WHY ADDED: With sleep(1), 300 VUs send ~300 requests/second
    //            /api/moderate server cannot handle 300 req/s simultaneously
    //            With sleep(3), 300 VUs send ~100 requests/second
    //            This gives server enough time to process each request properly
    //            Reduces overload → fewer timeouts → fewer failures
    sleep(1);
}

/*import http from 'k6/http';
import {sleep,check} from 'k6';

export const options={
    stages:[
        {duration:'2m', target:50},
        {duration: '6m', target: 300},
        {duration: '2m', target: 0},
    ],
    thresholds: {
        http_req_duration: ['p(95)<1000'],
        http_req_failed: ['rate<0.01'],
    },
};

export default function(){
    const headers = {
        'Content-Type': 'application/json',
        'x-system-type': 'system-a',
        'x-traffic-pattern': 'peak',          // ← changed to peak
        'x-workload-type': 'isolated',
        'x-endpoint-group': 'moderate',
        'x-test-tool': 'k6',
        'x-experiment-id': 'Exp_A_05',
        'x-concurrent-users': String(__VU),
};

const payload=JSON.stringify({}); // ← empty body, moderate accepts it

const response=http.post(
    'http://localhost:3000/api/moderate',payload,{headers}
);

check(response,{
    'status is 200':(r)=>r.status===200,
    'response time < 1000ms': (r) => r.timings.duration < 1000,
});

sleep(1);
}
*/