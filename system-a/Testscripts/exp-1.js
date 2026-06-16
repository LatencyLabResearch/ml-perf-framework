import http from 'k6/http';
import {sleep, check} from 'k6';

export const options={
    vus:50,// 50 users
    duration:'10m',//10 minutes
    thresholds:{
        http_req_duration:['p(95)<500'],
        http_req_failed:['rate<0.01'],
    },
};

export default function(){
    const headers={
    'Content-Type':'application/json',
    'x-system-type':'system-a',
    'x-traffic-pattern':'steady',
    'x-workload-type':'isolated',
    'x-endpoint-group':'lightweight',
    'x-test-tool':'k6',
    'x-experiment-id':'Exp-A-01',
    'x-concurrent-users': String(__VU),
    };

const response = http.get('http://localhost:3000/api/light', { headers });
    check(response,{
        'status is 200': (r) => r && r.status === 200,
        'response time <500ms': (r) => r && r.timings && r.timings.duration < 500,
    });

    sleep(1);

    }

    