import { getApiBaseUrl } from "./config.js";
import { chromeStorage } from "./chromeStorage.js";

async function apiRequest(endpoint, options = {}) {
  const url = `${getApiBaseUrl()}${endpoint}`;
  const { authToken } = await chromeStorage.getSession("authToken");

  const config = {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(options.headers || {}),
    },
  };

  if (options.body) {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, config);

  if (!response.ok) {
    let body = null;
    try {
      body = await response.json();
    } catch {
      // Non-JSON error body — fall through with body = null below.
    }

    const detail = body?.detail;
    const code = typeof detail === "object" ? detail?.code : undefined;
    const message =
      (typeof detail === "object" ? detail?.message : detail) ||
      `API Error ${response.status}`;

    // The backend uses this specific code (see Backend/consentGate.py) so
    // the app can redirect to the consent screen instead of treating it as
    // a generic auth failure. Fired as a window event, since apiRequest has
    // no reference to the App-level auth state.
    if (code === "CONSENT_REQUIRED") {
      window.dispatchEvent(new CustomEvent("consent-required"));
    }

    const error = new Error(message);
    error.status = response.status;
    error.code = code;
    throw error;
  }

  return response.status === 204 ? null : response.json();
}

export const UserAPI = {
  signInWithGoogle: (accessToken) =>
    apiRequest(`/auth/google`, {
      method: "POST",
      body: { access_token: accessToken },
    }),
  getMe: () => apiRequest(`/me`),
  saveGroqKey: (apiKey) =>
    apiRequest(`/me/keys/groq`, { method: "PUT", body: { api_key: apiKey } }),
  deleteGroqKey: () => apiRequest(`/me/keys/groq`, { method: "DELETE" }),
};

export const ConsentAPI = {
  // Server always stamps its own current ToS/Privacy version — nothing to
  // send here, the checkbox on-screen is what represents the user's intent.
  accept: () => apiRequest(`/consent`, { method: "POST" }),
  status: () => apiRequest(`/consent/status`),
};

export const AccountAPI = {
  deleteAccount: () => apiRequest(`/account`, { method: "DELETE" }),
};

export const AgentAPI = {
  getAgents: () => apiRequest(`/agents`),

  createAgent: (data) => apiRequest(`/agents`, { method: "POST", body: data }),

  // Returns SavedPageResponse[] — each item has display_url (clean) and url (full)
  getAgentUrls: (agentId) => apiRequest(`/agents/${agentId}/urls`),

  deleteAgent: (agentId) =>
    apiRequest(`/agents/${agentId}`, { method: "DELETE" }),
};

export const PageAPI = {
  // Ingest a page — sends full URL, backend normalizes before storing
  ingestPage: (data) =>
    apiRequest(`/ingest_page`, { method: "POST", body: data }),

  // Delete a page and its Chroma vectors
  deletePage: (pageId) => apiRequest(`/pages/${pageId}`, { method: "DELETE" }),
};

export const ChatAPI = {
  getChatsByAgent: (agentId) => apiRequest(`/chats/${agentId}`),

  createChat: (data) => apiRequest(`/chats`, { method: "POST", body: data }),

  renameChat: (chatId, title) =>
    apiRequest(`/chats/${chatId}/title`, {
      method: "PATCH",
      body: { title },
    }),

  deleteChat: (chatId) => apiRequest(`/chats/${chatId}`, { method: "DELETE" }),
};

export const MessageAPI = {
  getMessages: (chatId) => apiRequest(`/messages/${chatId}`),
};

// Streaming queries are handled directly with fetch() in useMessages.js
// because apiRequest() calls response.json() which can't handle streams.
