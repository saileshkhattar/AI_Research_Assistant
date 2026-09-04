importScripts("config.js");

// ─────────────────────────────────────────────
// STORAGE KEY CONSTANTS
// Single source of truth — popup.js imports these same names
// ─────────────────────────────────────────────
const KEYS = {
  AGENTS:         "agents",
  ACTIVE_AGENT_ID: "activeAgentId",   // FIX: was mixed "activeAgent" / "activeAgentId"
  INBOX_AGENT_ID:  "inboxAgentId",
  GENERAL_AGENT_ID:"generalAgentId",
};

async function initIdentity() { /* Google sign-in is initiated by an extension page. */ }

// ─────────────────────────────────────────────
// SAVE PAGE  →  inject content script
// ─────────────────────────────────────────────
async function handleSavePage(tabId) {
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
  const storage = await chrome.storage.local.get([KEYS.ACTIVE_AGENT_ID]);
  const agentId = storage[KEYS.ACTIVE_AGENT_ID];
  const { authToken } = await chrome.storage.session.get("authToken");

  if (!agentId) { console.error("No activeAgentId"); return; }
  if (!authToken) {
    chrome.runtime.sendMessage({ action: "SAVE_RESULT", ok: false, error: "Sign in and add your Gemini API key first." });
    return;
  }

  try {
    const res = await fetch(`${getApiBaseUrl()}/ingest_page`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ agent_id: agentId, url, title, content }),
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
