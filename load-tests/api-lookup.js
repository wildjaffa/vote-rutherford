import http from "k6/http";
import { check, sleep } from "k6";

// Read from environment variables or use defaults
const BASE_URL = __ENV.BASE_URL || "http://localhost:4321";
const VUS = __ENV.VUS || 10;
const DURATION = __ENV.DURATION || "1m";

export const options = {
  vus: parseInt(VUS),
  duration: DURATION,
  thresholds: {
    http_req_duration: ["p(95)<500"], // 95% of requests must complete below 500ms
    http_req_failed: ["rate<0.01"], // Less than 1% of requests should fail
  },
};

// Sample search queries to simulate real user behavior
const queries = [
  "Main St",
  "Oak Dr",
  "Maple Ave",
  "Washington",
  "Jefferson",
  "Murfreesboro",
  "Smyrna",
  "La Vergne",
];

export default function () {
  const query = queries[Math.floor(Math.random() * queries.length)];
  const url = `${BASE_URL}/api/addresses/lookup?q=${encodeURIComponent(query)}&limit=10`;

  const res = http.get(url);

  check(res, {
    "status is 200": (r) => r.status === 200,
    "results returned": (r) => {
      const body = JSON.parse(r.body);
      return body.results && Array.isArray(body.results);
    },
  });

  // Pacing: wait a bit between requests to simulate human-like behavior
  // If we want raw throughput, we can remove this or reduce it.
  sleep(1);
}
