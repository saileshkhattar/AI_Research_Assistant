# TabChat

A Chrome extension that turns the pages you browse into AI agents you can query. Instead of one long undifferentiated chat, you organize around **agents** — named workspaces, each with its own saved pages and its own conversation, scoped so an agent only answers from what you've actually saved into it.

## How it works

1. Sign in with your Google account.
2. Create an agent for whatever you're working on — a research topic, a project, a comparison you're making across a dozen tabs.
3. Browse normally. Click **Save Page** on anything relevant; it's added to that agent. Nothing is sent anywhere until you do this.
4. Ask questions in the chat panel — answers are grounded only in the pages saved to that agent, not your whole browsing history and not a generic model guess.
5. Repeat for as many agents as you want. Each stays independent.

## Architecture

```
Extension (Manifest V3)          chat-ui (React, built into Extension/chat-ui)
   │  activeTab permission           │  agent sidebar, chat panel, consent gate
   │  Google Identity sign-in        │
   └───────────────┬──────────────────┘
                    │  HTTPS, bearer session token
                    ▼
            FastAPI backend
   ┌────────────────┼────────────────────┐
   │                │                    │
   ▼                ▼                    ▼
Postgres (Neon)   Redis (Upstash)    Chroma Cloud
relational data    short-lived        page-text chunks
(users, agents,    decrypt cache      + embeddings
chats, messages,   (5 min TTL)
consent, keys)

External AI providers:
  Groq        — chat completions, using the signed-in user's OWN API key
  Hugging Face — embeddings, using a single server-owned key
  AWS KMS      — encrypts every stored provider API key at rest
```

Nothing here runs on local disk. Postgres, Redis, and the vector store are all externally hosted, so the backend itself is stateless and safe to run on a free-tier host without losing data on redeploy or idle spin-down.

## Features beyond "chat with a page"

- **Agents, not one flat history.** Saved pages and chats are scoped per-agent, both in the relational schema and in vector retrieval (`agent_id` is a hard filter on every query, not just a UI grouping).
- **Consent gate, versioned.** Users must check a ToS/Privacy checkbox before the login button even enables. Consent is recorded server-side with a version number; bumping `CURRENT_TOS_VERSION` / `CURRENT_PRIVACY_VERSION` in `Backend/consentGate.py` forces every existing user to re-consent on next use — this is how the Chroma Cloud subprocessor disclosure got added without silently changing terms under existing users.
- **Full account deletion.** One authenticated, transactional endpoint (`DELETE /account`) cascades across every table — saved pages, chats, messages, the encrypted provider key — and separately purges the user's Chroma Cloud vectors and any cached decrypted key in Redis. Idempotent, session-authenticated only (never trusts a client-supplied user ID).
- **Sensitive-data warning.** A persistent, non-dismissible notice near the chat input tells users not to save pages containing health, financial, or government-ID information — TabChat isn't built or certified to handle that category of data, and Groq's own API terms prohibit submitting it.
- **Bring-your-own LLM key.** Chat completions use the signed-in user's own Groq API key, encrypted with AWS KMS before it ever touches the database, decrypted only in server memory, and cached (never persisted) for a short TTL to avoid a KMS call on every message.

## Local development

Backend (`Backend/`):

```bash
pip install -r requirements.txt -r requirements-dev.txt
uvicorn main:app --reload
```

Required environment variables — see `render.yaml` at the repo root for the full annotated list (data stores, AWS KMS, AI provider keys, CORS). Tables are created automatically on first boot via `Base.metadata.create_all()` — there's no separate migration step for a fresh database.

Run the test suite with:

```bash
cd Backend && pytest tests/ -v
```

Tests are fully offline — AWS KMS, Redis, and Chroma Cloud are all substituted with in-memory fakes in `tests/conftest.py`, so no real credentials or network access are needed to run them.

chat-ui (`chat-ui/`):

```bash
npm install
npm run build   # outputs into Extension/chat-ui — this is what actually ships
```

## Deploying

- **Postgres**: Neon (permanent free tier). Render's own free Postgres expires after 30 days; not suitable here.
- **Redis**: Upstash (permanent free tier). Used only as a short-lived cache, not a source of truth — losing it just means the next request re-decrypts via KMS.
- **Vector store**: Chroma Cloud. Replaced an earlier local-disk Chroma setup that silently lost data on every free-tier redeploy or idle spin-down.
- **Backend**: Render, via the `render.yaml` blueprint at the repo root. With `APP_ENV=production` set, the app refuses to boot unless `CORS_ALLOWED_ORIGINS` is also set to the exact `chrome-extension://<id>` origin — this is intentional, not a bug, to prevent an accidentally permissive CORS config from shipping.

Before packaging the extension for the Chrome Web Store:

1. Remove any `key` field from `Extension/manifest.json` — the Store rejects a first upload that includes one. (A fixed `key` is useful during local development to get a stable extension ID across reloads and machines, but the Store assigns its own ID on first publish.)
2. Set `Extension/config.js` and `chat-ui/public/config.js`'s `apiBaseUrl` to the real backend HTTPS origin.
3. Set the same origin in `Extension/manifest.json`'s `host_permissions`, replacing any `localhost` or placeholder value.
4. Confirm the Google Cloud OAuth client (type "Chrome Extension") is registered against whatever extension ID you're currently shipping — this has to be updated again once you have your final published Store ID, since it can differ from your local dev ID.
5. Zip the *contents* of `Extension/` (so `manifest.json` sits at the zip root), and submit via the Developer Dashboard.

## Legal

Terms of Service and Privacy Policy are served directly by the backend at `/legal/terms` and `/legal/privacy`, sourced from `Backend/legal/terms.md` and `privacy.md`. Both are versioned and tied to the consent-gate re-consent mechanism described above — update the markdown and bump the version constants together, never one without the other.

## Security notes

- Every protected route derives the user's identity from a verified session token, never from a client-supplied ID.
- Provider API keys are encrypted with AWS KMS at rest and only ever decrypted in server memory.
- Rate limiting is applied per client IP and endpoint, with tighter limits on costly routes (`/query/stream`, `/ingest_page`) than ordinary CRUD.
- No analytics or crash-reporting SDKs are integrated — the only data collected is what's described in the Privacy Policy.
