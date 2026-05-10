import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 50 },    // Ramp up to 50 users
    { duration: '5m', target: 50 },    // Stay at 50 users
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],   // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],      // Error rate under 1%
    errors: ['rate<0.05'],               // Custom error rate under 5%
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:8000';

// Test health endpoint
export function testHealth() {
  const response = http.get(`${BASE_URL}/api/v1/health`);
  
  const checkResult = check(response, {
    'health status is 200': (r) => r.status === 200,
    'health response time < 200ms': (r) => r.timings.duration < 200,
  });
  
  errorRate.add(!checkResult);
  sleep(1);
}

// Test auth endpoints
export function testAuth() {
  const payload = JSON.stringify({
    email: `test${Math.random()}@example.com`,
    password: 'TestPassword123!',
    full_name: 'Load Test User',
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  const response = http.post(`${BASE_URL}/api/v1/auth/register`, payload, params);
  
  const checkResult = check(response, {
    'register status is 200 or 400': (r) => r.status === 200 || r.status === 400,
    'register response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  errorRate.add(!checkResult);
  sleep(1);
}

// Test analytics endpoint
export function testAnalytics() {
  const response = http.get(`${BASE_URL}/api/v1/modules`);
  
  const checkResult = check(response, {
    'modules status is 200': (r) => r.status === 200,
    'modules response time < 300ms': (r) => r.timings.duration < 300,
  });
  
  errorRate.add(!checkResult);
  sleep(1);
}

// Main test scenario
export default function() {
  testHealth();
  testAnalytics();
  // testAuth(); // Uncomment to test auth (creates users)
}
