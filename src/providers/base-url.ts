export function normalizeBaseUrl(baseUrl: string, provider: string): string {
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new TypeError(`[waybound -> ${provider}] baseUrl must be an absolute HTTP(S) URL.`);
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new TypeError(`[waybound -> ${provider}] baseUrl must use HTTP or HTTPS.`);
  }

  if (url.search || url.hash) {
    throw new TypeError(`[waybound -> ${provider}] baseUrl must not contain query parameters or a hash.`);
  }

  return url.toString().replace(/\/$/, "");
}
