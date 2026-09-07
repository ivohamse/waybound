export type WayboundErrorCode =
  | "UNSUPPORTED_PROVIDER"
  | "UNSUPPORTED_FEATURE"
  | "UNSUPPORTED_PROFILE"
  | "PROVIDER_ERROR"
  | "RATE_LIMITED"
  | "NETWORK_ERROR"
  | "REQUEST_TIMEOUT"
  | "INVALID_RESPONSE";

export interface WayboundErrorOptions {
  provider?: string;
  status?: number;
  cause?: unknown;
}

export class WayboundError extends Error {
  readonly code: WayboundErrorCode;
  readonly provider?: string;
  readonly status?: number;

  constructor(
    code: WayboundErrorCode,
    message: string,
    options: WayboundErrorOptions = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "WayboundError";
    this.code = code;
    this.provider = options.provider;
    this.status = options.status;
  }
}
