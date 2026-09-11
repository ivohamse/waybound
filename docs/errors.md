# Errors

Waybound normalizes validation, capability, provider and network failures as `WayboundError`.

```ts
import { WayboundError } from "waybound";

try {
  // Waybound request
} catch (error) {
  if (error instanceof WayboundError) {
    console.error(error.code, error.message);
  }
}
```

Use `code` for application behaviour and `message` for diagnostics. Where available, errors also contain provider, HTTP-status and provider-message context.

`MISSING_CREDENTIAL` and `UNSUPPORTED_AUTHENTICATION` are raised before a request is sent. Treat rate limits, timeouts and unavailable providers as operational conditions rather than permanent entitlement decisions.
