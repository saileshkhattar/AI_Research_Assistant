const API_BASE_URL = "http://127.0.0.1:8000";


async function apiRequest(endpoint, options = {}) {

  const url = `${API_BASE_URL}${endpoint}`;

  const config = {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  };

  if (options.body) {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, config);

  if (!response.ok) {

    const errorText = await response.text();

    throw new Error(
      `API Error ${response.status}: ${errorText}`
    );

  }

  return response.json();

}


export const UserAPI = {

  createUser: (userId) =>
    apiRequest(`/users`, {
      method: "POST",
      body: { id: userId }
    }),

  getUser: (userId) =>
    apiRequest(`/users/${userId}`),

};


export const AgentAPI = {

  getAgents: (userId) =>
    apiRequest(`/agents/${userId}`),

  createAgent: (data) =>
    apiRequest(`/agents`, {
      method: "POST",
      body: data
    }),

};


export const PageAPI = {

  getPagesByAgent: (agentId) =>
    apiRequest(`/agents/${agentId}/pages`),

  ingestPage: (data) =>
    apiRequest(`/ingest_page`, {
      method: "POST",
      body: data
    }),

};


export const ChatAPI = {

  getChatsByAgent: (agentId) =>
    apiRequest(`/chats/${agentId}`),

  createChat: (data) =>
    apiRequest(`/chats`, {
      method: "POST",
      body: data
    }),

};


export const MessageAPI = {

  getMessages: (chatId) =>
    apiRequest(`/messages/${chatId}`),

  createMessage: (data) =>
    apiRequest(`/messages`, {
      method: "POST",
      body: data
    }),

};


export const QueryAPI = {

  query: (data) =>
    apiRequest(`/query`, {
      method: "POST",
      body: data
    }),

};