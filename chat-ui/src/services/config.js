export function getApiBaseUrl() {
  const configured = globalThis.__RESEARCH_ASSISTANT_CONFIG__?.apiBaseUrl;

  if (!configured) {
    throw new Error("The extension is not configured with an API URL.");
  }

  const url = new URL(configured); // `configured` must be the URL STRING, not the config object
  if (url.protocol !== "https:" && url.hostname !== "localhost") {
    throw new Error("The API URL must use HTTPS outside local development.");
  }
  return url.origin;
}
