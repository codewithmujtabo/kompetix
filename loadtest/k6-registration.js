// k6 load test — student registration flow.
//
// Run:
//   k6 run loadtest/k6-registration.js \
//       --vus 50 --duration 60s \
//       --env BASE=https://staging-api.competzy.com
//
// Goal: 500 concurrent registrations sustain p95 < 2s on the registration
// chain (signup → /me → /competitions → POST /registrations).
// This script signs up a fresh user per VU iteration so there's no DB
// contention on existing rows.

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const BASE = __ENV.BASE || 'http://localhost:3000';
const COMP_ID = __ENV.COMP_ID || 'comp_emc_2026_main'; // replace per environment

const signupTime  = new Trend('signup_ms');
const meTime      = new Trend('me_ms');
const compsTime   = new Trend('competitions_ms');
const registerTime = new Trend('register_ms');
const errors      = new Rate('errors');

export const options = {
  scenarios: {
    surge: {
      executor: 'ramping-vus',
      stages: [
        { duration: '30s', target: 50 },   // warm up
        { duration: '1m',  target: 200 },  // sustained
        { duration: '30s', target: 500 },  // peak
        { duration: '30s', target: 0 },    // ramp down
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    'http_req_failed':         ['rate<0.02'],     // <2% failures
    'http_req_duration{type:registration}': ['p(95)<2000'],
    errors: ['rate<0.05'],
  },
};

export default function () {
  const id = `${__VU}-${__ITER}-${Date.now()}`;
  const payload = JSON.stringify({
    email:     `loadtest+${id}@competzy.test`,
    password:  'loadtest123',
    fullName:  `Load Test ${id}`,
    phone:     `+621555${String(__VU).padStart(4, '0')}${String(__ITER).padStart(4, '0')}`,
    city:      'Jakarta',
    province:  'DKI Jakarta',
    role:      'student',
    roleData:  { school: 'SMA Test', grade: '10', npsn: '99999999' },
    consentAccepted: true,
  });

  const headers = { 'Content-Type': 'application/json' };

  // 1) Signup — also sets the auth cookie via Set-Cookie
  const signupRes = http.post(`${BASE}/api/auth/signup`, payload, { headers, tags: { type: 'signup' } });
  signupTime.add(signupRes.timings.duration);
  if (!check(signupRes, { 'signup 201': r => r.status === 201 })) {
    errors.add(1);
    return;
  }
  const token = signupRes.json('token');
  const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // 2) /me hydrate
  const meRes = http.get(`${BASE}/api/auth/me`, { headers: auth, tags: { type: 'me' } });
  meTime.add(meRes.timings.duration);
  check(meRes, { 'me 200': r => r.status === 200 }) || errors.add(1);

  // 3) Browse public competitions list
  const compsRes = http.get(`${BASE}/api/competitions`, { tags: { type: 'competitions' } });
  compsTime.add(compsRes.timings.duration);
  check(compsRes, { 'comps 200': r => r.status === 200 }) || errors.add(1);

  // 4) Register for the configured competition
  const regId = `REG-LOADTEST-${id}`;
  const regRes = http.post(
    `${BASE}/api/registrations`,
    JSON.stringify({ id: regId, compId: COMP_ID }),
    { headers: auth, tags: { type: 'registration' } }
  );
  registerTime.add(regRes.timings.duration);
  check(regRes, { 'register 201/200': r => r.status === 201 || r.status === 200 }) || errors.add(1);

  sleep(1); // realistic think time between iterations
}
