const API_BASE = "http://127.0.0.1:8000";

const els = {
  question: document.getElementById("question"),
  askBtn: document.getElementById("askBtn"),
  messages: document.getElementById("messages"),
  status: document.getElementById("status"),
  pageCount: document.getElementById("pageCount"),
  currentPageStatus: document.getElementById("currentPageStatus"),
  thisPageOnly: document.getElementById("thisPageOnly"),
  saveCurrentPage: document.getElementById("saveCurrentPage"),
  clearHistory: document.getElementById("clearHistory")
};

let messages = [];

document.addEventListener("DOMContentLoaded", async () => {
  await loadMessages();
  await updateStats();
  attachEvents();
});



// ---------- STORAGE ----------
async function loadMessages() {
  const res = await chrome.storage.local.get("chatHistory");
  messages = res.chatHistory || [];
  renderMessages();
}

async function saveMessages() {
  await chrome.storage.local.set({ chatHistory: messages });
}

// ---------- RENDER ----------
function renderMessages() {

  if (!messages.length) {
    document.getElementById("emptyState").style.display = "flex";
    els.messages.style.display = "none";
    return;
  }

  document.getElementById("emptyState").style.display = "none";
  els.messages.style.display = "flex";

  els.messages.innerHTML = messages
    .map(m => {
      return `
        <div class="message ${m.role}">
          <div class="message-content">${escapeHtml(m.content)}</div>
        </div>
      `;
    })
    .join("");

  scrollToBottom();
}

function scrollToBottom() {
  setTimeout(() => {
    const container = document.getElementById("chatContainer");
    container.scrollTop = container.scrollHeight;
  }, 50);
}

// ---------- UTIL ----------
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ---------- EVENTS ----------
function attachEvents() {
  els.askBtn.addEventListener("click", askHandler);
  els.saveCurrentPage.addEventListener("click", savePageHandler);
  els.clearHistory.addEventListener("click", clearHistory);
}

// ---------- ASK ----------
async function askHandler() {

  const question = els.question.value.trim();
  if (!question) return;

  els.question.value = "";

  addMessage("user", question);

  try {
    let url = null;

    if (els.thisPageOnly.checked) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      url = tab?.url || null;
    }

    const res = await fetch(`${API_BASE}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        url
      })
    });

    const data = await res.json();
    addMessage("assistant", data.answer);

  } catch {
    addMessage("assistant", "Error contacting backend.");
  }
}

function addMessage(role, content) {
  messages.push({ role, content });
  saveMessages();
  renderMessages();
}

// ---------- SAVE PAGE ----------
async function savePageHandler() {

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const response = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => ({
        title: document.title,
        content: document.body?.innerText.slice(0, 30000)
      })
    });

    const { title, content } = response[0].result;

    await fetch(`${API_BASE}/ingest_page`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: tab.url,
        title,
        content
      })
    });

    els.status.textContent = "Page saved!";

  } catch {
    els.status.textContent = "Save failed";
  }
}

// ---------- CLEAR ----------
async function clearHistory() {
  messages = [];
  await saveMessages();
  renderMessages();
}

// ---------- STATS ----------
async function updateStats() {
  try {

    const stats = await fetch(`${API_BASE}/stats`).then(r => r.json());
    els.pageCount.textContent = stats.page_count;

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const check = await fetch(`${API_BASE}/check_page?url=${encodeURIComponent(tab.url)}`)
      .then(r => r.json());

    els.currentPageStatus.textContent = check.exists ? "Saved" : "Not saved";

  } catch {}
}

setInterval(updateStats, 10000);

