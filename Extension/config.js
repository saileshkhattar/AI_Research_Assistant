/* Replace in the release pipeline. This file must never contain secrets. */
globalThis.__RESEARCH_ASSISTANT_CONFIG__ = { apiBaseUrl: "" };

function getApiBaseUrl() {
  const value = globalThis.__RESEARCH_ASSISTANT_CONFIG__.apiBaseUrl;
  if (!value) throw new Error("Extension API URL has not been configured.");
  const url = new URL(value);
  if (url.protocol !== "https:" && url.hostname !== "localhost") {
    throw new Error("The extension API must use HTTPS outside local development.");
  }
  return url.origin;
}
