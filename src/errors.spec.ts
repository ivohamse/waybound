import { describe, expect, it } from "vitest";
import { Router } from "./router";
import { WayboundError } from "./errors";

describe("WayboundError", () => {
  it("stores a stable error code and optional provider metadata", () => {
    const cause = new Error("upstream failure");
    const error = new WayboundError(
      "PROVIDER_ERROR",
      "GraphHopper request failed.",
      {
        provider: "GraphHopper",
        status: 503,
        cause,
      },
    );

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("WayboundError");
    expect(error.code).toBe("PROVIDER_ERROR");
    expect(error.provider).toBe("GraphHopper");
    expect(error.status).toBe(503);
    expect(error.cause).toBe(cause);
  });

  it("uses a typed error for unsupported providers", () => {
    expect(() =>
      new Router({
        provider: "unsupported" as never,
        apiKey: "test-key",
      }),
    ).toThrowError(
      expect.objectContaining({
        name: "WayboundError",
        code: "UNSUPPORTED_PROVIDER",
      }),
    );
  });
});
