# Configuration

`Router` receives a `RoutingProvider` instance. Provider choice, credentials and HTTP settings therefore stay together.

```ts
const provider = new OpenRouteServiceProvider({
  authentication: { type: "api-key", value: "YOUR_API_KEY" },
  http: { timeoutMs: 5_000, maxRetries: 1 },
});
const router = new Router({ provider });
```

## Authentication

Built-in hosted ORS and GraphHopper adapters currently require an API key for every implemented feature. A request without credentials fails locally with `MISSING_CREDENTIAL`; an unsupported scheme produces `UNSUPPORTED_AUTHENTICATION`.

```ts
router.capabilities.directions.authentication;
// { required: true, schemes: ["api-key"] }
```

Custom providers may expose authentication-free features with `authentication: { required: false, schemes: [] }`. Credentials are never exposed through `Router` or its capabilities.

## Custom endpoints

Set `baseUrl` to use a compatible self-hosted server, proxy or alternative endpoint.

```ts
const provider = new GraphHopperProvider({
  baseUrl: "http://localhost:8989/api/1",
  authentication: { type: "api-key", value: "YOUR_API_KEY" },
});
```

`baseUrl` must be an absolute HTTP(S) URL without query parameters or a hash; trailing slashes are normalized. Endpoint-specific enabled features and authentication remain the application's responsibility.
