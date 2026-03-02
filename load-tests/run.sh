#!/bin/bash

# Configuration
BASE_URL=${BASE_URL:-"http://localhost:4321"}
API_VUS=${API_VUS:-100}
API_DURATION=${API_DURATION:-"5m"}
PAGE_CONCURRENCY=${PAGE_CONCURRENCY:-10}

echo "===================================================="
echo "Starting Unified Load Test"
echo "Target URL: $BASE_URL"
echo "API Load: $API_VUS concurrent users for $API_DURATION"
echo "Page Load (Playwright): $PAGE_CONCURRENCY concurrent workers"
echo "===================================================="

# Ensure output directory exists
mkdir -p load-tests/results

# Run k6 in the background
echo "Launching k6 for API lookup..."
BASE_URL=$BASE_URL VUS=$API_VUS DURATION=$API_DURATION \
  k6 run load-tests/api-lookup.js --summary-export=load-tests/results/api-summary.json &
K6_PID=$!

# Run Playwright
# NOTE: To run with high concurrency in Playwright, we use workers.
# This script doesn't simulate "long duration" in the same way k6 does by default,
# but we can run it in a loop or increase workers for density.
echo "Launching Playwright for page render..."
BASE_URL=$BASE_URL \
  npx playwright test load-tests/page-ballot.spec.ts --workers=$PAGE_CONCURRENCY --repeat-each=10

# Wait for k6 to finish if it hasn't already
wait $K6_PID

echo "===================================================="
echo "Load Tests Complete"
echo "API Results: load-tests/results/api-summary.json"
echo "===================================================="
