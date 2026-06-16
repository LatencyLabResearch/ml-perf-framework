import http from 'k6/http';
import {sleep,check} from 'k6';

export const options={
    stages:[
        {duration:'2m', target:50},
        {duration:'6m', target:300},
        {duration:'2m', target:0},
    ],
    thresholds:{
        http_req_duration:['p(95)<500'],
        http_req_failed:['rate<0.01'],
    },
};

export default function(){
    const headers = {
        'Content-Type': 'application/json',
        'x-system-type': 'system-a',
        'x-traffic-pattern': 'peak',          // ← changed to peak
        'x-workload-type': 'isolated',
        'x-endpoint-group': 'light',
        'x-test-tool': 'k6',
        'x-experiment-id': 'Exp_A_04',
        'x-concurrent-users': String(__VU),
};

const response=http.get('http://localhost:3000/api/light',{headers});

check(response,{
    'status is 200':(r)=>r.status===200,
    'response time < 500ms': (r) => r.timings.duration < 500,
});

sleep(1);
}
