# Test reporting

Waybound writes reusable reports alongside normal Vitest terminal output.

## Commands

```bash
npm run test:report
npm run test:live:report
```

Additional Vitest arguments are forwarded, for example:

```bash
npm run test:live:report -- -t "GraphHopper / matrix / hike"
```

A filtered run verifies only that selection, not the full capability matrix.

## Output

```text
test-output/
  unit/
    latest.log
    latest.json
  live/
    latest.log
    latest.json
    history/
      <timestamp>.json
```

`test-output/` is ignored by Git. Do not run multiple reporting commands for the
same mode concurrently: they share the `latest` files.

- `latest.log` retains terminal output without ANSI colors. Live logs also include
  a compact provider/feature/profile, HTTP status, error and timing summary.
- `latest.json` retains Vitest's normal summary and per-test results, including
  failed/skipped tests, timings, messages and stack traces.
- Live JSON adds a `waybound` object (`schemaVersion: 1`) with execution records.
  The normal Vitest results remain authoritative for test-run success, skipped
  tests, collection errors and runner timeouts. A record is written when a case
  completes, so a worker crash may leave fewer records than declared tests.
- Live history stores the enriched JSON, not just the original Vitest output.
- Old `latest` files are cleared before running. A startup failure cannot reuse a
  previous successful report. Completed history remains available.

The runner preserves Vitest's exit code. Writing a report never turns a failed
provider call into a successful test. Reporting failures also cause a nonzero exit.

## Live coverage

The live suite builds cases from the instantiated providers' capability metadata.
Every supported feature/profile combination is exercised. Isochrones are tested
separately for `time` and `distance`.

Current coverage is 30 cases:

| Provider | Route | Nearest | Matrix | Isochrones | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| OpenRouteService | 3 | 3 | 3 | 6 | 15 |
| GraphHopper | 3 | 3 | 3 | 6 | 15 |

Each uses small, fixed Utrecht inputs: two points for routes/matrices, one point
for nearest and one range for isochrones. With the current adapters this produces
one HTTP request per case. GraphHopper nearest remains a reverse-geocoding
approximation even when all profile cases pass.

Tests validate public output contracts and geographic structure, not identical
routes or exact travel times. Keep visual playground checks alongside the tests
to inspect route choice, snapping and polygon geography.

## Credentials and pacing

Configure `.env` in the repository root (or equivalent environment variables):

```dotenv
ORS_API_KEY=your-key
GRAPHHOPPER_API_KEY=your-key
WAYBOUND_LIVE_PROVIDERS=ors,graphhopper
WAYBOUND_LIVE_DELAY_MS=1500
WAYBOUND_LIVE_TIMEOUT_MS=10000
```

The three `WAYBOUND_LIVE_*` settings are optional; the values shown are defaults.
Use `WAYBOUND_LIVE_PROVIDERS=ors` or `graphhopper` to test just one account. Unknown
provider names fail configuration rather than silently producing no coverage.
Missing credentials fail the selected cases and are marked `configuration`.
Unselected providers are outside the run's coverage, not successful tests.

Calls run sequentially with no HTTP or test retries. The pause is between cases,
before the HTTP timeout starts. Delay may be 0–60000 ms; timeout 1–60000 ms. Raise
the delay if your account needs more spacing. This does not bypass daily quotas
or account feature restrictions: 429, 400/403, timeouts and invalid responses
remain failures. Thirty cases at the default delay take at least about 44 seconds,
plus provider response time.

## Live metadata

Each `waybound.cases` item includes:

- `id`, `provider`, `feature`, `profile`, optional `rangeType` and `startedAt`;
- `status`: `passed` only after the call and its assertions succeed, or `failed`;
- `durationMs`: total operation and assertion time, excluding the pacing pause;
- `http`: observed HTTP attempts with `status` and `responseHeadersMs`;
- `wayboundErrorCode`, when the failure is a typed Waybound error;
- `failureKind`: rate-limit, timeout, network, provider, invalid-response,
  configuration or assertion.

`responseHeadersMs` measures fetch until response headers, not full body parsing
or server-only compute time. A request without an HTTP response has `status: null`
and a transport error. A configuration failure has no HTTP observations. An HTTP
200 can still fail output assertions.

The test-only observer does not store request URLs, headers, credentials or
payloads. Instrumentation and reporting do not change the public Waybound API.
