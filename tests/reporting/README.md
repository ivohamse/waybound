# Test reporting

Waybound can write reusable test reports alongside the normal terminal output.

## Commands

```bash
npm run test:report
npm run test:live:report
```

The live command uses the same environment variables as `npm run test:live`.

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

`test-output/` is intentionally ignored by Git.

- `latest.log` is a plain-text copy of the normal Vitest terminal output with ANSI styling removed.
- `latest.json` is Vitest's machine-readable JSON report for the most recent run.
- live runs also keep a timestamped JSON snapshot in `history/` so runs can be compared later.

The reporting runner exits with the same status code as Vitest, so producing a report never turns a failing test run into a successful one.

## Next step

The current scaffold records normal Vitest test data. Provider-specific live metadata such as provider, feature, profile, HTTP status, Waybound error code and response duration can be added when the live test matrix is refactored. That metadata should extend the report rather than replace the underlying Vitest result.
