# Research Assistant

A Chrome extension and FastAPI backend for research chats grounded in pages the user explicitly saves.

## Release checklist

1. Deploy the backend behind HTTPS with a managed database and persistent vector storage. Do not deploy the included SQLite database for a multi-user release.
2. Set `DATABASE_URL`, `GOOGLE_API_KEY`, and `CORS_ALLOWED_ORIGINS`. The latter must contain the exact published extension origin, for example `chrome-extension://<your-store-extension-id>`.
3. Set `apiBaseUrl` in both `Extension/config.js` and `chat-ui/public/config.js` to the HTTPS API origin before packaging. It is public configuration—never put keys or tokens in it.
4. Replace the `https://api.example.com/*` placeholder in `Extension/manifest.json` with that same API origin. The extension uses `activeTab`, so page access is granted only after the user invokes it from the active tab.
5. Build the chat UI with `npm ci && npm run build` from `chat-ui`, then package the `Extension` directory. Run `npm run lint` before every release.
6. Publish a privacy policy, support URL, and a clear consent disclosure: page text is sent to your backend and embedding/model providers only when the user chooses **Save Page**.

## Important security boundary

This repository currently uses an anonymous local user ID. It is adequate only for local, single-user development—not a real authorization system. Before a public launch, add server-side authentication (OAuth or magic-link/session auth), derive the user identity from the verified token, and remove client-supplied `user_id` values from API authorization decisions. Add per-user rate limits and quotas at the API gateway/backend too.

## Gemini key and throttling

The extension asks for a Gemini key before use and stores it in `chrome.storage.session` only. It is cleared when the browser restarts, is never written to the database, and is never logged. The key is sent only in the `X-Gemini-Api-Key` HTTPS request header to perform an embedding or generation request. Do not change this to `chrome.storage.local`: it is persistence, not a secure secret vault.

The backend applies in-process sliding-window limits: 10 streamed queries/minute, 12 page ingestions/minute, 60 other mutating requests/minute, and 180 reads/minute per client IP and endpoint. For a multi-instance deployment, replace `Backend/rateLimit.py` with a shared Redis or API-gateway limiter and key it to the authenticated account—not client IP. A `429` from Gemini is shown in the chat as a quota message; Gemini quotas are tied to the Google project rather than the API key and vary by tier. See the official [Gemini rate-limit documentation](https://ai.google.dev/gemini-api/docs/rate-limits).
