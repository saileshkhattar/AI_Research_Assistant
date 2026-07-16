importScripts("config.js");

// ─────────────────────────────────────────────
// STORAGE KEY CONSTANTS
// Single source of truth — popup.js imports these same names
// ─────────────────────────────────────────────
const KEYS = {
  USER_ID:        "userId",
  AGENTS:         "agents",
  ACTIVE_AGENT_ID: "activeAgentId",   // FIX: was mixed "activeAgent" / "activeAgentId"
  INBOX_AGENT_ID:  "inboxAgentId",
  GENERAL_AGENT_ID:"generalAgentId",
};

// ─────────────────────────────────────────────
// USER BOOTSTRAP
// ─────────────────────────────────────────────
async function ensureUser() {
  const { userId } = await chrome.storage.local.get(KEYS.USER_ID);

  if (userId) {
    // Confirm the user still exists in the backend
    try {
      const res = await fetch(`${getApiBaseUrl()}/users/${userId}`);
      if (res.ok) return userId;
    } catch (_) {
      // Backend unreachable — return cached id and retry later
      return userId;
    }
  }

  // Create a new user
  const res = await fetch(`${getApiBaseUrl()}/users`, { method: "POST" });
  if (!res.ok) throw new Error(`Failed to create user: ${res.status}`);

  const { id: newId } = await res.json();
  await chrome.storage.local.set({ [KEYS.USER_ID]: newId });
  console.log("Created new user:", newId);
  return newId;
}

// ─────────────────────────────────────────────
// AGENT BOOTSTRAP
// ─────────────────────────────────────────────
async function ensureAgents(userId) {
  const res = await fetch(`${getApiBaseUrl()}/agents/${userId}`);
  if (!res.ok) throw new Error(`Failed to fetch agents: ${res.status}`);

  const agents = await res.json();

  if (!agents || agents.length === 0) {
    console.error("No agents returned from backend");
    return;
  }

  const inbox   = agents.find((a) => a.type === "system_inbox");
  const general = agents.find((a) => a.type === "general");

  // Read existing active agent — preserve user's selection across reloads
  const { activeAgentId: existing } = await chrome.storage.local.get(KEYS.ACTIVE_AGENT_ID);
  const stillValid = existing && agents.find((a) => a.id === existing);

  await chrome.storage.local.set({
    [KEYS.AGENTS]:          agents,
    [KEYS.INBOX_AGENT_ID]:  inbox?.id   || null,
    [KEYS.GENERAL_AGENT_ID]:general?.id || null,
    // Only reset active agent if the stored one is gone
    [KEYS.ACTIVE_AGENT_ID]: stillValid
      ? existing
      : (inbox?.id || general?.id || agents[0]?.id),
  });

  console.log("Agents initialised:", agents.length);
}

// ─────────────────────────────────────────────
// IDENTITY INIT  (idempotent — safe to call many times)
// ─────────────────────────────────────────────
async function initIdentity() {
  try {
    const userId = await ensureUser();
    await ensureAgents(userId);
    console.log("Identity ready, userId:", userId);
  } catch (err) {
    console.error("initIdentity failed:", err);
  }
}

// ─────────────────────────────────────────────
// SAVE PAGE  →  inject content script
// ─────────────────────────────────────────────
async function handleSavePage(tabId) {
  await initIdentity();
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"],
    });
  } catch (err) {
    console.error("Script injection failed:", err);
    // Notify popup of failure
    chrome.runtime.sendMessage({ action: "SAVE_RESULT", ok: false, error: err.message });
  }
}

// ─────────────────────────────────────────────
// PAGE CAPTURED  →  ingest to backend
// FIX: was reading "activeAgent" (undefined) — now reads "activeAgentId"
// ─────────────────────────────────────────────
async function handlePageCaptured({ content, title, url }) {
  await initIdentity();

  const storage = await chrome.storage.local.get([KEYS.USER_ID, KEYS.ACTIVE_AGENT_ID]);
  const userId  = storage[KEYS.USER_ID];
  const agentId = storage[KEYS.ACTIVE_AGENT_ID];
  const { geminiApiKey } = await chrome.storage.session.get("geminiApiKey");

  if (!userId)  { console.error("No userId");  return; }
  if (!agentId) { console.error("No activeAgentId"); return; }
  if (!geminiApiKey) {
    chrome.runtime.sendMessage({ action: "SAVE_RESULT", ok: false, error: "Add your Gemini API key in the extension first." });
    return;
  }

  try {
    const res = await fetch(`${getApiBaseUrl()}/ingest_page`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", "X-Gemini-Api-Key": geminiApiKey },
      body: JSON.stringify({ user_id: userId, agent_id: agentId, url, title, content }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err.detail || `HTTP ${res.status}`;
      console.warn("Ingest response:", msg);
      chrome.runtime.sendMessage({ action: "SAVE_RESULT", ok: false, error: msg });
      return;
    }

    const result = await res.json();
    console.log("Page ingested:", result);
    chrome.runtime.sendMessage({ action: "SAVE_RESULT", ok: true, result });

  } catch (err) {
    console.error("Ingest network error:", err);
    chrome.runtime.sendMessage({ action: "SAVE_RESULT", ok: false, error: err.message });
  }
}

// ─────────────────────────────────────────────
// MESSAGE ROUTER
// ─────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
  if (message.action === "INIT_IDENTITY") initIdentity();
  if (message.action === "Save_Page")     handleSavePage(message.tabId);
  if (message.action === "Page_Captured") handlePageCaptured(message);
  return true; // keep message channel open for async responses
});

// ─────────────────────────────────────────────
// STARTUP
// ─────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => initIdentity());
chrome.runtime.onStartup.addListener(()    => initIdentity());
