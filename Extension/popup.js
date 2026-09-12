// ─────────────────────────────────────────────────────────────
// KEYS comes from keys.js (loaded before this script in popup.html) —
// single source of truth shared with background.js.
// ─────────────────────────────────────────────────────────────

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
  select: document.getElementById("agentSelect"),
  helper: document.getElementById("agentHelper"),
  pageCount: document.getElementById("pageCount"),
  agentCount: document.getElementById("agentCount"),
  currentPageUrl: document.getElementById("currentPageUrl"),

  createBtn: document.getElementById("createAgentBtn"),
  viewUrlsBtn: document.getElementById("viewUrlsBtn"),

  agentModal: document.getElementById("agentModal"),
  confirmCreate: document.getElementById("confirmCreateBtn"),
  cancelCreate: document.getElementById("cancelCreateBtn"),
  cancelCreate2: document.getElementById("cancelCreateBtn2"),
  agentNameInput: document.getElementById("agentNameInput"),
  createError: document.getElementById("createError"),

  urlsModal: document.getElementById("urlsModal"),
  urlsList: document.getElementById("urlsList"),
  closeUrls: document.getElementById("closeUrlsBtn"),

  saveBtn: document.getElementById("savePageBtn"),
  statusMsg: document.getElementById("statusMessage"),

  askBtn: document.getElementById("askBtn"), // FIX: was undeclared var
  questionBox: document.getElementById("questionBox"),
  keySetup: document.getElementById("keySetup"),
  keyEntry: document.getElementById("keyEntry"),
  keySteps: document.getElementById("keySteps"),
  groqKeyInput: document.getElementById("groqKeyInput"),
  saveGroqKey: document.getElementById("saveGroqKeyBtn"),
  showKeySteps: document.getElementById("showKeyStepsBtn"),
  backToKey: document.getElementById("backToKeyBtn"),
  keyError: document.getElementById("keyError"),

  consentSlide: document.getElementById("consentSlide"),
  consentHeading: document.getElementById("consentHeading"),
  consentIntro: document.getElementById("consentIntro"),
  consentCheckbox: document.getElementById("consentCheckbox"),
  consentError: document.getElementById("consentError"),
  consentContinueBtn: document.getElementById("consentContinueBtn"),

  accountBtn: document.getElementById("accountBtn"),
  accountModal: document.getElementById("accountModal"),
  closeAccountBtn: document.getElementById("closeAccountBtn"),
  manageGroqKeyBtn: document.getElementById("manageGroqKeyBtn"),
  accountModalBody: document.getElementById("accountModalBody"),
  deleteConfirmInput: document.getElementById("deleteConfirmInput"),
  deleteError: document.getElementById("deleteError"),
  confirmDeleteBtn: document.getElementById("confirmDeleteBtn"),
};

// ─────────────────────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────────────────────
let agents = [];
let currentTab = null;

async function apiFetch(path, options = {}) {
  const { authToken } = await chrome.storage.session.get("authToken");
  return fetch(`${API}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
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
  const meRes = await apiFetch(`/me`);
  if (!meRes.ok) {
    showBanner(
      "Could not reach the backend — check your connection and try again.",
    );
    showGoogleSignIn();
    return;
  }
  const me = await meRes.json();
  if (!me?.consent_current) {
    showConsentRequired();
    return;
  }
  if (!me?.has_groq_key) {
    showKeySetup();
    return;
  }

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
  el.consentSlide.classList.add("hidden");
  el.keyEntry.classList.remove("hidden");
  el.saveGroqKey.onclick = async () => {
    const key = el.groqKeyInput.value.trim();
    if (key.length < 20) {
      el.keyError.textContent = "Enter a valid Groq API key.";
      el.keyError.classList.remove("hidden");
      return;
    }
    // Unified onto the shared apiFetch() helper (was hand-rolled fetch +
    // manual token attachment) — a token already exists at this point
    // in the flow, so there's no reason not to use it here too.
    const response = await apiFetch(`/me/keys/groq`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: key }),
    });
    if (!response.ok) {
      el.keyError.textContent = "Could not save your key.";
      el.keyError.classList.remove("hidden");
      return;
    }
    window.location.reload();
  };
  el.showKeySteps.onclick = () => {
    el.keyEntry.classList.add("hidden");
    el.keySteps.classList.remove("hidden");
  };
  el.backToKey.onclick = () => {
    el.keySteps.classList.add("hidden");
    el.keyEntry.classList.remove("hidden");
  };
}

// ─────────────────────────────────────────────────────────────
// CONSENT GATE
// Shown either right after a fresh Google sign-in (see showGoogleSignIn)
// or when an existing session's consent has gone stale — e.g. after we
// bump CURRENT_TOS_VERSION/CURRENT_PRIVACY_VERSION on the backend, /me
// starts reporting consent_current: false again for every user.
// ─────────────────────────────────────────────────────────────
function showConsentRequired({ freshSignIn = false } = {}) {
  el.keySetup.classList.remove("hidden");
  el.keyEntry.classList.add("hidden");
  el.keySteps.classList.add("hidden");
  el.consentSlide.classList.remove("hidden");

  el.consentHeading.textContent = freshSignIn
    ? "Terms & Privacy"
    : "Our terms have been updated";
  el.consentIntro.textContent = freshSignIn
    ? "Please review and accept our Terms of Service and Privacy Policy."
    : "Please review and accept our updated Terms of Service and Privacy Policy to continue.";
  el.consentContinueBtn.textContent = freshSignIn
    ? "Continue"
    : "I Agree & Continue";
  el.consentCheckbox.checked = false;
  el.consentContinueBtn.disabled = true;
  el.consentError.classList.add("hidden");

  el.consentCheckbox.onchange = () => {
    el.consentContinueBtn.disabled = !el.consentCheckbox.checked;
  };

  el.consentContinueBtn.onclick = async () => {
    el.consentContinueBtn.disabled = true;
    el.consentContinueBtn.textContent = "Saving…";
    try {
      const response = await apiFetch(`/consent`, { method: "POST" });
      if (!response.ok) throw new Error();
      window.location.reload();
    } catch {
      el.consentError.textContent =
        "Could not save your consent. Please try again.";
      el.consentError.classList.remove("hidden");
      el.consentContinueBtn.disabled = false;
      el.consentContinueBtn.textContent = freshSignIn
        ? "Continue"
        : "I Agree & Continue";
    }
  };
}

function showGoogleSignIn() {
  el.keySetup.classList.remove("hidden");
  el.keySetup.innerHTML = `<div class="key-slide"><div class="section-label">Research AI workspace</div><h1>Sign in to continue</h1><p>Use your Google account to securely save research and manage your Groq key.</p><label class="consent-row"><input type="checkbox" id="signinConsentCheckbox"/><span>I agree to the <a href="https://example.com/terms" target="_blank" rel="noreferrer">Terms of Service</a> and <a href="https://example.com/privacy" target="_blank" rel="noreferrer">Privacy Policy</a></span></label><button id="googleSignInBtn" class="btn google-btn full-width" disabled><svg class="google-logo" viewBox="0 0 18 18" aria-hidden="true"><path fill="#EA4335" d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.483h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.909c1.703-1.567 2.683-3.875 2.683-6.616Z"/><path fill="#4285F4" d="M9 18c2.43 0 4.468-.806 5.957-2.179l-2.909-2.258c-.806.54-1.837.859-3.048.859-2.344 0-4.328-1.584-5.036-3.71H.957v2.332A9 9 0 0 0 9 18Z"/><path fill="#FBBC05" d="M3.964 10.712A5.41 5.41 0 0 1 3.682 9c0-.594.102-1.171.282-1.712V4.956H.957A9 9 0 0 0 0 9c0 1.453.348 2.829.957 4.044l3.007-2.332Z"/><path fill="#34A853" d="M9 3.58c1.322 0 2.508.455 3.443 1.348l2.583-2.583C13.464.891 11.426 0 9 0A9 9 0 0 0 .957 4.956l3.007 2.332C4.672 5.164 6.656 3.58 9 3.58Z"/></svg>Continue with Google</button><div id="keyError" class="error-text hidden"></div></div>`;

  const checkbox = document.getElementById("signinConsentCheckbox");
  const signInBtn = document.getElementById("googleSignInBtn");
  checkbox.onchange = () => {
    signInBtn.disabled = !checkbox.checked;
  };

  signInBtn.onclick = async () => {
    if (!checkbox.checked) return; // guarded by disabled state anyway
    try {
      const result = await chrome.identity.getAuthToken({ interactive: true });
      const googleToken = typeof result === "string" ? result : result?.token;
      const response = await fetch(`${API}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: googleToken }),
      });
      if (!response.ok) throw new Error();
      const session = await response.json();
      await chrome.storage.session.set({ authToken: session.access_token });

      // The checkbox above IS the user's consent — record it server-side
      // right away, before letting them into a usable session, per the
      // same rule the backend enforces (client-claimed consent is never
      // trusted; only a POST /consent call from an authenticated session
      // counts).
      const consentResponse = await apiFetch(`/consent`, { method: "POST" });
      if (!consentResponse.ok) throw new Error();

      window.location.reload();
    } catch {
      document.getElementById("keyError").textContent =
        "Sign-in failed. Try again.";
      document.getElementById("keyError").classList.remove("hidden");
    }
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
    KEYS.AGENTS,
    KEYS.ACTIVE_AGENT_ID,
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
    if (!res.ok) {
      showBanner("Could not refresh agents — showing your last known list.");
      return;
    }
    clearBanner();
    agents = await res.json();
    await chrome.storage.local.set({ [KEYS.AGENTS]: agents });

    const { [KEYS.ACTIVE_AGENT_ID]: current } = await chrome.storage.local.get(
      KEYS.ACTIVE_AGENT_ID,
    );
    renderDropdown(current);
    await updatePageCount();
  } catch (err) {
    console.error("refreshAgents failed:", err);
    showBanner("Network error while refreshing agents.");
  }
}

// ─────────────────────────────────────────────────────────────
// RENDER AGENT DROPDOWN
// ─────────────────────────────────────────────────────────────
function renderDropdown(activeId) {
  el.select.innerHTML = "";

  // System agents first, then custom
  const system = agents.filter(
    (a) => a.type === "system_inbox" || a.type === "general",
  );
  const custom = agents.filter(
    (a) => a.type !== "system_inbox" && a.type !== "general",
  );

  [...system, ...custom].forEach((agent) => {
    const opt = document.createElement("option");
    opt.value = agent.id;
    opt.text = agent.name;
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
  if (!agent) {
    el.helper.textContent = "";
    return;
  }

  const descriptions = {
    system_inbox: "Inbox — best for single-page questions.",
    general: "General — best for open-ended research.",
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
    if (!res.ok) {
      showBanner("Could not refresh page count.");
      return;
    }
    const pages = await res.json();
    el.pageCount.textContent = pages.length;
  } catch (_) {
    showBanner("Network error while fetching page count.");
  }
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
  el.createBtn.onclick = openCreateModal;
  el.cancelCreate.onclick = closeCreateModal;
  el.cancelCreate2.onclick = closeCreateModal;
  el.confirmCreate.onclick = createAgent;
  el.agentNameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") createAgent();
    if (e.key === "Escape") closeCreateModal();
  });

  // View URLs modal
  el.viewUrlsBtn.onclick = showUrls;
  el.closeUrls.onclick = () => el.urlsModal.classList.add("hidden");

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

  // Account modal
  el.accountBtn.onclick = openAccountModal;
  el.closeAccountBtn.onclick = closeAccountModal;
  el.accountModal.addEventListener("click", (e) => {
    if (e.target === el.accountModal) closeAccountModal();
  });
  el.manageGroqKeyBtn.onclick = () => {
    closeAccountModal();
    showKeySetup();
  };
  el.deleteConfirmInput.addEventListener("input", () => {
    el.confirmDeleteBtn.disabled = el.deleteConfirmInput.value !== "DELETE";
  });
  el.confirmDeleteBtn.onclick = deleteAccount;
}

// ─────────────────────────────────────────────────────────────
// ACCOUNT MODAL
// ─────────────────────────────────────────────────────────────
function openAccountModal() {
  el.deleteConfirmInput.value = "";
  el.confirmDeleteBtn.disabled = true;
  el.confirmDeleteBtn.textContent = "Delete my account";
  el.deleteError.classList.add("hidden");
  el.accountModal.classList.remove("hidden");
}

function closeAccountModal() {
  el.accountModal.classList.add("hidden");
}

async function deleteAccount() {
  if (el.deleteConfirmInput.value !== "DELETE") return;
  el.confirmDeleteBtn.disabled = true;
  el.confirmDeleteBtn.textContent = "Deleting…";
  el.deleteError.classList.add("hidden");

  try {
    const response = await apiFetch(`/account`, { method: "DELETE" });
    if (!response.ok) throw new Error();

    // Clear the local session and any cached Google token so the
    // extension can't silently sign back in with stale credentials.
    await chrome.storage.session.remove("authToken");
    if (chrome.identity?.clearAllCachedAuthTokens) {
      try {
        await chrome.identity.clearAllCachedAuthTokens();
      } catch {
        // Non-fatal — the account is already gone server-side either way.
      }
    }

    el.accountModalBody.innerHTML = `<p style="color: var(--accent);">Account deleted. Everything tied to your account has been removed.</p>`;
    setTimeout(() => window.location.reload(), 1500);
  } catch {
    el.deleteError.textContent =
      "Could not delete your account. Please try again.";
    el.deleteError.classList.remove("hidden");
    el.confirmDeleteBtn.disabled = false;
    el.confirmDeleteBtn.textContent = "Delete my account";
  }
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
    if (!res.ok) {
      el.urlsList.innerHTML = `<div class="urls-empty">Failed to load pages (server error).</div>`;
      return;
    }
    const pages = await res.json();

    if (!pages.length) {
      el.urlsList.innerHTML = `<div class="urls-empty">No pages saved yet.<br/>Browse a page and click Save.</div>`;
      return;
    }

    el.urlsList.innerHTML = "";

    pages.forEach((page) => {
      const item = document.createElement("div");
      item.className = "url-item";

      const title =
        page.title && page.title.trim() ? page.title : page.display_url;
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
    // If the button is still disabled, SAVE_RESULT never arrived —
    // re-enable it AND fix the stuck 'Saving page…' status text
    // (was previously left stuck with no indication of failure).
    if (el.saveBtn.disabled) {
      el.saveBtn.disabled = false;
      setStatus("No response from extension — try again.", "error");
      setTimeout(() => setStatus("", ""), 4000);
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

function showBanner(msg) {
  const banner = document.getElementById("errorBanner");
  if (!banner) return;
  banner.textContent = msg;
  banner.classList.remove("hidden");
}

function clearBanner() {
  const banner = document.getElementById("errorBanner");
  if (!banner) return;
  banner.classList.add("hidden");
}

// ─────────────────────────────────────────────────────────────
// OPEN CHAT UI
// ─────────────────────────────────────────────────────────────
function openChat() {
  // FIX: the typed "Quick Ask" question used to be silently discarded —
  // now passed through as URL params so chat-ui can pick it up and
  // pre-fill / auto-send the question on load. chat-ui's own code needs
  // a matching change to actually read these params — flagged separately.
  const question = el.questionBox.value.trim();
  const agentId = el.select.value;
  const params = new URLSearchParams();
  if (agentId) params.set("agent_id", agentId);
  if (question) params.set("q", question);

  const base = chrome.runtime.getURL("chat-ui/index.html");
  const chatUrl = params.toString() ? `${base}?${params.toString()}` : base;
  chrome.tabs.create({ url: chatUrl });

  el.questionBox.value = "";
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
