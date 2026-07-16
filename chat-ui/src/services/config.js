const configuredBaseUrl = globalThis.__RESEARCH_ASSISTANT_CONFIG__?.apiBaseUrl;

/**
 * Returns the API origin configured at packaging/deployment time. Keeping this
 * outside application code prevents dev URLs from accidentally shipping.
 */
export function getApiBaseUrl() {
  if (!configuredBaseUrl) {
    throw new Error("The extension is not configured with an API URL.");
  }

  const url = new URL(configuredBaseUrl);
  if (url.protocol !== "https:" && url.hostname !== "localhost") {
    throw new Error("The API URL must use HTTPS outside local development.");
  }
  return url.origin;
}
