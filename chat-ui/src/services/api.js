import { getApiBaseUrl } from "./config.js";
import { chromeStorage } from "./chromeStorage.js";

async function apiRequest(endpoint, options = {}) {
  const url = `${getApiBaseUrl()}${endpoint}`;
  const { geminiApiKey } = await chromeStorage.getSession("geminiApiKey");

  const config = {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(geminiApiKey ? { "X-Gemini-Api-Key": geminiApiKey } : {}),
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
  createUser: () => apiRequest(`/users`, { method: "POST" }),
  getUser: (userId) => apiRequest(`/users/${userId}`),
};

export const AgentAPI = {
  getAgents: (userId) => apiRequest(`/agents/${userId}`),

  createAgent: (data) =>
    apiRequest(`/agents`, { method: "POST", body: data }),

  // Returns SavedPageResponse[] — each item has display_url (clean) and url (full)
  getAgentUrls: (agentId, userId) => apiRequest(`/agents/${agentId}/urls?user_id=${encodeURIComponent(userId)}`),

  deleteAgent: (agentId, userId) =>
    apiRequest(`/agents/${agentId}?user_id=${userId}`, { method: "DELETE" }),
};

export const PageAPI = {
  // Ingest a page — sends full URL, backend normalizes before storing
  ingestPage: (data) =>
    apiRequest(`/ingest_page`, { method: "POST", body: data }),

  // Delete a page and its Chroma vectors
  deletePage: (pageId, userId) =>
    apiRequest(`/pages/${pageId}?user_id=${userId}`, { method: "DELETE" }),
};

export const ChatAPI = {
  getChatsByAgent: (agentId, userId) =>
    apiRequest(`/chats/${agentId}/${userId}`),

  createChat: (data) =>
    apiRequest(`/chats`, { method: "POST", body: data }),

  renameChat: (chatId, userId, title) =>
    apiRequest(`/chats/${chatId}/title?user_id=${userId}`, {
      method: "PATCH",
      body: { title },
    }),

  deleteChat: (chatId, userId) =>
    apiRequest(`/chats/${chatId}?user_id=${userId}`, { method: "DELETE" }),
};

export const MessageAPI = {
  getMessages: (chatId, userId) =>
    apiRequest(`/messages/${chatId}?user_id=${userId}`),
};

// Streaming queries are handled directly with fetch() in useMessages.js
// because apiRequest() calls response.json() which can't handle streams.
