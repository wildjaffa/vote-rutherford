# Load Testing Suite

This directory contains scripts for load testing the application endpoints.

## Prerequisites

1.  **k6**: Install via [k6.io](https://k6.io/docs/getting-started/installation/)
    ```bash
    sudo gpg -k
    sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
    echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
    sudo apt-get update
    sudo apt-get install k6
    ```
2.  **Playwright**: Already part of dev dependencies (run `npx playwright install` if needed).

## Scripts

- `api-lookup.js`: k6 script for testing `/api/addresses/lookup`.
- `page-ballot.spec.ts`: Playwright test for `/my-ballot` showing server island rendering.
- `run.sh`: Unified runner for both tests.

## Running Tests

You can run the unified script with environment variables to control the load:

```bash
chmod +x load-tests/run.sh

# Target a specific environment with custom load
BASE_URL="https://your-production-url.com" \
API_VUS=1000 \
API_DURATION="5m" \
PAGE_CONCURRENCY=20 \
./load-tests/run.sh
```

### Resource Note for 5k Concurrent Users

Running 5,000 concurrent Playwright sessions locally is **not recommended** due to extreme RAM/CPU requirements. Use k6 for the primary load generation and Playwright for functional verification under that load.
