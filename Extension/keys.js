// ─────────────────────────────────────────────────────────────
// SHARED STORAGE KEY CONSTANTS
// Single source of truth for chrome.storage key names.
// Loaded by BOTH background.js (via importScripts) and popup.js
// (via <script src="keys.js"> before popup.js in popup.html) —
// so a rename here can never silently desync the two contexts.
// ─────────────────────────────────────────────────────────────
const KEYS = {
  AGENTS: "agents",
  ACTIVE_AGENT_ID: "activeAgentId",
};
