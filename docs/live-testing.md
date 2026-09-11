# Live testing

Waybound has an optional live-provider suite for validating real provider behaviour. It requires API keys and can be affected by outages, account restrictions and rate limits.

```bash
npm run test:report
npm run test:live:report
```

The offline suite needs no credentials. The live suite writes JSON and log reports, including provider failures and skipped or unavailable capability cases.

For provider selection, pacing, environment variables and report details, see the [test reporting guide](../tests/reporting/README.md).
