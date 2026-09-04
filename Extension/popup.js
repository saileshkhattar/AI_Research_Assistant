// ─────────────────────────────────────────────────────────────
// STORAGE KEY CONSTANTS — must match background.js exactly
// ─────────────────────────────────────────────────────────────
const KEYS = {
  AGENTS:          "agents",
  ACTIVE_AGENT_ID: "activeAgentId",  // FIX: was "activeAgent" in old popup — mismatched background
};

const API = (() => {
  try {
    return getApiBaseUrl();
  } catch (error) {
    console.error(error);
    return null;
  }
})();

// ─────────────────────────────────────────────────────────────
// DOM REFS
// ─────────────────────────────────────────────────────────────
const el = {
  select:         document.getElementById("agentSelect"),
  helper:         document.getElementById("agentHelper"),
  pageCount:      document.getElementById("pageCount"),
  agentCount:     document.getElementById("agentCount"),
  currentPageUrl: document.getElementById("currentPageUrl"),

  createBtn:      document.getElementById("createAgentBtn"),
  viewUrlsBtn:    document.getElementById("viewUrlsBtn"),

  agentModal:     document.getElementById("agentModal"),
  confirmCreate:  document.getElementById("confirmCreateBtn"),
  cancelCreate:   document.getElementById("cancelCreateBtn"),
  cancelCreate2:  document.getElementById("cancelCreateBtn2"),
  agentNameInput: document.getElementById("agentNameInput"),
  createError:    document.getElementById("createError"),

  urlsModal:      document.getElementById("urlsModal"),
  urlsList:       document.getElementById("urlsList"),
  closeUrls:      document.getElementById("closeUrlsBtn"),

  saveBtn:        document.getElementById("savePageBtn"),
  statusMsg:      document.getElementById("statusMessage"),

  askBtn:         document.getElementById("askBtn"),        // FIX: was undeclared var
  questionBox:    document.getElementById("questionBox"),
  keySetup:       document.getElementById("keySetup"),
  keyEntry:       document.getElementById("keyEntry"),
  keySteps:       document.getElementById("keySteps"),
  geminiKeyInput: document.getElementById("geminiKeyInput"),
  saveGeminiKey:  document.getElementById("saveGeminiKeyBtn"),
  showKeySteps:   document.getElementById("showKeyStepsBtn"),
  backToKey:      document.getElementById("backToKeyBtn"),
  keyError:       document.getElementById("keyError"),
};

// ─────────────────────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────────────────────
let agents   = [];
let currentTab = null;

async function apiFetch(path, options = {}) {
  const { authToken } = await chrome.storage.session.get("authToken");
  return fetch(`${API}${path}`, {
    ...options,
    headers: { ...(options.headers || {}), ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
  });
}

// ─────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  const { authToken } = await chrome.storage.session.get("authToken");
  if (!authToken) {
    showGoogleSignIn();
    return;
  }
  const me = await fetch(`${API}/me`, { headers: { Authorization: `Bearer ${authToken}` } }).then((r) => r.ok ? r.json() : null);
  if (!me?.has_gemini_key) { showKeySetup(); return; }
  // Trigger background identity init
  chrome.runtime.sendMessage({ action: "INIT_IDENTITY" });

  // Get current tab info
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;
  if (tab?.url) {
    el.currentPageUrl.textContent = displayUrl(tab.url);
    el.currentPageUrl.title = tab.url;
  }

  await loadState();
  attachEvents();

  // Listen for background save results
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "SAVE_RESULT") handleSaveResult(msg);
  });
});

function showKeySetup() {
  el.keySetup.classList.remove("hidden");
  el.saveGeminiKey.onclick = async () => {
    const key = el.geminiKeyInput.value.trim();
    if (key.length < 20) { el.keyError.textContent = "Enter a valid Gemini API key."; el.keyError.classList.remove("hidden"); return; }
    const { authToken } = await chrome.storage.session.get("authToken");
    const response = await fetch(`${API}/me/gemini-key`, {
      method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ api_key: key }),
    });
    if (!response.ok) { el.keyError.textContent = "Could not save your key."; el.keyError.classList.remove("hidden"); return; }
    window.location.reload();
  };
  el.showKeySteps.onclick = () => { el.keyEntry.classList.add("hidden"); el.keySteps.classList.remove("hidden"); };
  el.backToKey.onclick = () => { el.keySteps.classList.add("hidden"); el.keyEntry.classList.remove("hidden"); };
}

function showGoogleSignIn() {
  el.keySetup.classList.remove("hidden");
  el.keySetup.innerHTML = `<div class="key-slide"><div class="section-label">Private research setup</div><h1>Sign in to continue</h1><p>Use Google to securely save your research and encrypted Gemini key.</p><button id="googleSignInBtn" class="btn btn-accent full-width">Continue with Google</button><div id="keyError" class="error-text hidden"></div></div>`;
  document.getElementById("googleSignInBtn").onclick = async () => {
    try {
      const result = await chrome.identity.getAuthToken({ interactive: true });
      const googleToken = typeof result === "string" ? result : result?.token;
      const response = await fetch(`${API}/auth/google`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ access_token: googleToken }) });
      if (!response.ok) throw new Error();
      const session = await response.json();
      await chrome.storage.session.set({ authToken: session.access_token });
      window.location.reload();
    } catch { document.getElementById("keyError").textContent = "Google sign-in failed. Try again."; document.getElementById("keyError").classList.remove("hidden"); }
  };
}

// ─────────────────────────────────────────────────────────────
// LOAD STATE FROM STORAGE + BACKEND
// ─────────────────────────────────────────────────────────────
async function loadState() {
  if (!API) {
    setStatus("Extension API URL is not configured.", "error");
    return;
  }
  const storage = await chrome.storage.local.get([
    KEYS.USER_ID, KEYS.AGENTS, KEYS.ACTIVE_AGENT_ID,
  ]);

  agents = storage[KEYS.AGENTS] || [];

  // If we have agents in storage, render immediately
  if (agents.length) {
    renderDropdown(storage[KEYS.ACTIVE_AGENT_ID]);
    await updatePageCount();
  }

  // Always refresh from backend for latest state
  await refreshAgents();
}

// ─────────────────────────────────────────────────────────────
// FETCH AGENTS FROM BACKEND AND SYNC STORAGE
// ─────────────────────────────────────────────────────────────
async function refreshAgents() {
  try {
    const res = await apiFetch(`/agents`);
    if (!res.ok) return;
    agents = await res.json();
    await chrome.storage.local.set({ [KEYS.AGENTS]: agents });

    const { [KEYS.ACTIVE_AGENT_ID]: current } = await chrome.storage.local.get(KEYS.ACTIVE_AGENT_ID);
    renderDropdown(current);
    await updatePageCount();
  } catch (err) {
    console.error("refreshAgents failed:", err);
  }
}

// ─────────────────────────────────────────────────────────────
// RENDER AGENT DROPDOWN
// ─────────────────────────────────────────────────────────────
function renderDropdown(activeId) {
  el.select.innerHTML = "";

  // System agents first, then custom
  const system = agents.filter((a) => a.type === "system_inbox" || a.type === "general");
  const custom  = agents.filter((a) => a.type !== "system_inbox" && a.type !== "general");

  [...system, ...custom].forEach((agent) => {
    const opt = document.createElement("option");
    opt.value = agent.id;
    opt.text  = agent.name;
    el.select.appendChild(opt);
  });

  // Pre-select stored active agent
  if (activeId && agents.find((a) => a.id === activeId)) {
    el.select.value = activeId;
  } else if (agents.length) {
    el.select.value = agents[0].id;
    persistActiveAgent(agents[0].id);
  }

  el.agentCount.textContent = agents.length;
  updateHelper();
}

// ─────────────────────────────────────────────────────────────
// UPDATE HELPER TEXT UNDER DROPDOWN
// ─────────────────────────────────────────────────────────────
function updateHelper() {
  const agent = agents.find((a) => a.id === el.select.value);
  if (!agent) { el.helper.textContent = ""; return; }

  const descriptions = {
    system_inbox: "Inbox — best for single-page questions.",
    general:      "General — best for open-ended research.",
  };
  el.helper.textContent = descriptions[agent.type] ?? "Custom knowledge base.";
}

// ─────────────────────────────────────────────────────────────
// UPDATE PAGE COUNT STAT (pages saved to active agent)
// FIX: was always 0 — now fetches real count from backend
// ─────────────────────────────────────────────────────────────
async function updatePageCount() {
  const agentId = el.select.value;
  if (!agentId) return;
  try {
    const res = await apiFetch(`/agents/${encodeURIComponent(agentId)}/urls`);
    if (!res.ok) return;
    const pages = await res.json();
    el.pageCount.textContent = pages.length;
  } catch (_) {}
}

// ─────────────────────────────────────────────────────────────
// PERSIST ACTIVE AGENT TO STORAGE
// FIX: old code saved as "activeAgent" — now uses "activeAgentId"
// ─────────────────────────────────────────────────────────────
async function persistActiveAgent(agentId) {
  await chrome.storage.local.set({ [KEYS.ACTIVE_AGENT_ID]: agentId });
}

// ─────────────────────────────────────────────────────────────
// EVENT BINDINGS
// ─────────────────────────────────────────────────────────────
function attachEvents() {
  el.select.onchange = async () => {
    await persistActiveAgent(el.select.value);
    updateHelper();
    await updatePageCount();
  };

  // Create agent modal
  el.createBtn.onclick    = openCreateModal;
  el.cancelCreate.onclick = closeCreateModal;
  el.cancelCreate2.onclick= closeCreateModal;
  el.confirmCreate.onclick= createAgent;
  el.agentNameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") createAgent();
    if (e.key === "Escape") closeCreateModal();
  });

  // View URLs modal
  el.viewUrlsBtn.onclick = showUrls;
  el.closeUrls.onclick   = () => el.urlsModal.classList.add("hidden");

  // Close modals on backdrop click
  el.agentModal.addEventListener("click", (e) => {
    if (e.target === el.agentModal) closeCreateModal();
  });
  el.urlsModal.addEventListener("click", (e) => {
    if (e.target === el.urlsModal) el.urlsModal.classList.add("hidden");
  });

  // Save page
  el.saveBtn.onclick = savePage;

  // Ask / open chat
  // FIX: was `askBtn.addEventListener` — `askBtn` was undefined (not in `els`)
  el.askBtn.onclick = openChat;
}

// ─────────────────────────────────────────────────────────────
// CREATE AGENT
// ─────────────────────────────────────────────────────────────
function openCreateModal() {
  el.agentNameInput.value = "";
  el.createError.classList.add("hidden");
  el.agentModal.classList.remove("hidden");
  setTimeout(() => el.agentNameInput.focus(), 50);
}

function closeCreateModal() {
  el.agentModal.classList.add("hidden");
  el.agentNameInput.value = "";
  el.createError.classList.add("hidden");
}

async function createAgent() {
  const name = el.agentNameInput.value.trim();
  if (!name) {
    showCreateError("Agent name cannot be empty.");
    return;
  }

  el.confirmCreate.disabled = true;
  el.confirmCreate.textContent = "Creating…";

  try {
    const res = await apiFetch(`/agents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      showCreateError(err.detail || "Failed to create agent.");
      return;
    }

    const newAgent = await res.json();

    // Refresh agent list and switch to the new one
    await refreshAgents();
    el.select.value = newAgent.id;
    await persistActiveAgent(newAgent.id);
    updateHelper();
    await updatePageCount();

    closeCreateModal();
  } catch (err) {
    showCreateError("Network error. Is the backend running?");
  } finally {
    el.confirmCreate.disabled = false;
    el.confirmCreate.textContent = "Create";
  }
}

function showCreateError(msg) {
  el.createError.textContent = msg;
  el.createError.classList.remove("hidden");
}

// ─────────────────────────────────────────────────────────────
// SHOW SAVED URLS MODAL
// FIX: was using raw u.url — now uses u.display_url (scheme stripped)
// FIX: added delete button per row
// ─────────────────────────────────────────────────────────────
async function showUrls() {
  const agentId = el.select.value;
  el.urlsList.innerHTML = `<div class="urls-empty">Loading…</div>`;
  el.urlsModal.classList.remove("hidden");

  try {
    const res = await apiFetch(`/agents/${encodeURIComponent(agentId)}/urls`);
    const pages = await res.json();

    if (!pages.length) {
      el.urlsList.innerHTML = `<div class="urls-empty">No pages saved yet.<br/>Browse a page and click Save.</div>`;
      return;
    }

    el.urlsList.innerHTML = "";

    pages.forEach((page) => {
      const item = document.createElement("div");
      item.className = "url-item";

      const title   = page.title && page.title.trim() ? page.title : page.display_url;
      const display = page.display_url || page.url;

      item.innerHTML = `
        <span class="url-icon">⊡</span>
        <div class="url-text">
          <div class="url-title">${escHtml(title)}</div>
          <div class="url-display">${escHtml(display)}</div>
        </div>
        <button class="btn btn-danger url-delete" data-id="${page.id}" title="Remove">✕</button>
      `;

      // Click row → open full URL in new tab
      item.addEventListener("click", (e) => {
        if (e.target.closest(".url-delete")) return;
        chrome.tabs.create({ url: page.url });
      });

      // Delete button
      item.querySelector(".url-delete").addEventListener("click", async (e) => {
        e.stopPropagation();
        await deletePage(page.id, item);
      });

      el.urlsList.appendChild(item);
    });

    // Update count in header after render
    el.pageCount.textContent = pages.length;

  } catch (err) {
    el.urlsList.innerHTML = `<div class="urls-empty">Failed to load pages.</div>`;
  }
}

async function deletePage(pageId, itemEl) {
  itemEl.style.opacity = "0.4";
  itemEl.style.pointerEvents = "none";
  try {
    const res = await apiFetch(`/pages/${pageId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      itemEl.remove();
      // Decrement count
      const current = parseInt(el.pageCount.textContent, 10) || 1;
      el.pageCount.textContent = Math.max(0, current - 1);
    } else {
      itemEl.style.opacity = "";
      itemEl.style.pointerEvents = "";
    }
  } catch (_) {
    itemEl.style.opacity = "";
    itemEl.style.pointerEvents = "";
  }
}

// ─────────────────────────────────────────────────────────────
// SAVE CURRENT PAGE
// FIX: no longer reports instant success — waits for SAVE_RESULT message
// ─────────────────────────────────────────────────────────────
async function savePage() {
  if (!currentTab?.id) {
    setStatus("No active tab found.", "error");
    return;
  }

  el.saveBtn.disabled = true;
  setStatus("Saving page…", "");

  chrome.runtime.sendMessage({
    action: "Save_Page",
    tabId: currentTab.id,
  });

  // Timeout fallback — background may not respond if content script is blocked
  setTimeout(() => {
    if (el.saveBtn.disabled) {
      el.saveBtn.disabled = false;
      // Don't overwrite a result that already came in
    }
  }, 8000);
}

function handleSaveResult({ ok, error }) {
  el.saveBtn.disabled = false;
  if (ok) {
    setStatus("✓ Page saved to assistant!", "ok");
    updatePageCount(); // refresh count
  } else {
    const msg = error?.includes("already saved")
      ? "Already saved to this assistant."
      : `Error: ${error || "unknown"}`;
    setStatus(msg, "error");
  }
  setTimeout(() => setStatus("", ""), 4000);
}

function setStatus(text, type) {
  el.statusMsg.textContent = text;
  el.statusMsg.className = "status-message" + (type ? ` ${type}` : "");
}

// ─────────────────────────────────────────────────────────────
// OPEN CHAT UI
// ─────────────────────────────────────────────────────────────
function openChat() {
  const chatUrl = chrome.runtime.getURL("chat-ui/index.html");
  chrome.tabs.create({ url: chatUrl });
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

/**
 * Strip scheme + www from a URL for compact display.
 * Matches the backend display_url() logic.
 */
function displayUrl(url) {
  try {
    const u = new URL(url);
    let host = u.hostname.replace(/^www\./, "");
    let path = u.pathname.replace(/\/$/, "");
    let full = host + path + (u.search || "");
    return full.length > 55 ? full.slice(0, 52) + "…" : full;
  } catch {
    return url;
  }
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
