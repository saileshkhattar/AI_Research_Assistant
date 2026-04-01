const API_BASE_URL = "http://127.0.0.1:8000";

async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  // Build config cleanly — do NOT spread options into config or the raw
  // options.body object overwrites the serialised config.body string.
  const config = {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
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

  return response.json();
}

export const UserAPI = {
  // Backend POST /users takes no body — it generates its own UUID.
  createUser: () => apiRequest(`/users`, { method: "POST" }),

  getUser: (userId) => apiRequest(`/users/${userId}`),
};

export const AgentAPI = {
  getAgents: (userId) => apiRequest(`/agents/${userId}`),

  createAgent: (data) =>
    apiRequest(`/agents`, { method: "POST", body: data }),

  // Backend route is /agents/{agent_id}/urls (not /pages)
  getAgentUrls: (agentId) => apiRequest(`/agents/${agentId}/urls`),
};

export const ChatAPI = {
  getChatsByAgent: (agentId, userId) =>
    apiRequest(`/chats/${agentId}/${userId}`),

  createChat: (data) =>
    apiRequest(`/chats`, { method: "POST", body: data }),
};

export const MessageAPI = {
  // GET /messages/{chat_id}?user_id=...
  getMessages: (chatId, userId) =>
    apiRequest(`/messages/${chatId}?user_id=${userId}`),
};

// Note: streaming queries are done directly with fetch() in useMessages.js
// because apiRequest() calls response.json() and can't handle streams.
