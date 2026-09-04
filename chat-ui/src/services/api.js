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
    const errorText = await response.text();
    throw new Error(`API Error ${response.status}: ${errorText}`);
  }

  return response.status === 204 ? null : response.json();
}

export const UserAPI = {
  signInWithGoogle: (accessToken) => apiRequest(`/auth/google`, { method: "POST", body: { access_token: accessToken } }),
  getMe: () => apiRequest(`/me`),
  saveGeminiKey: (apiKey) => apiRequest(`/me/gemini-key`, { method: "PUT", body: { api_key: apiKey } }),
  deleteGeminiKey: () => apiRequest(`/me/gemini-key`, { method: "DELETE" }),
};

export const AgentAPI = {
  getAgents: () => apiRequest(`/agents`),

  createAgent: (data) =>
    apiRequest(`/agents`, { method: "POST", body: data }),

  // Returns SavedPageResponse[] — each item has display_url (clean) and url (full)
  getAgentUrls: (agentId) => apiRequest(`/agents/${agentId}/urls`),

  deleteAgent: (agentId) => apiRequest(`/agents/${agentId}`, { method: "DELETE" }),
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

  createChat: (data) =>
    apiRequest(`/chats`, { method: "POST", body: data }),

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
