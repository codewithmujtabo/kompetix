# Load Tests

Pre-launch performance verification. Targets per Sprint 17.

## Setup

```bash
brew install k6
```

## Running

```bash
# Local backend
k6 run loadtest/k6-registration.js

# Staging — must export BASE and COMP_ID for a valid public competition
COMP_ID=comp_emc_2026_main k6 run loadtest/k6-registration.js \
  --env BASE=https://staging-api.competzy.com
```

## Targets (Launch 1, July 1, 2026)

| Metric                             | Threshold        |
|------------------------------------|------------------|
| Concurrent VUs                     | 500 sustained    |
| http_req_duration p95              | < 2000 ms        |
| http_req_failed rate               | < 2 %            |
| errors metric (assertions)         | < 5 %            |
| Backend RSS memory after 1h        | < 700 MB stable  |

If thresholds fail: profile with `pm2 monit`, check Postgres `pg_stat_activity`
for slow queries, and look for unbounded list endpoints (e.g. `/competitions`
without pagination).

## After running

`k6 run` prints a final summary. Pipe to a file with `--summary-export
summary.json` if you want to diff between runs.
