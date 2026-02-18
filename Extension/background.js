// background.js
// Owns identity + agents + ingestion

const API_BASE = "http://127.0.0.1:8000";

let initPromise = null;


// ======================================================
// ENSURE USER (BACKEND CREATES USER, NOT EXTENSION)
// ======================================================
async function ensureUser() {

  const storage = await chrome.storage.local.get("userId");

  if (storage.userId) {

    try {

      const res = await fetch(`${API_BASE}/users/${storage.userId}`);

      if (res.ok) {
        return storage.userId;
      }

    } catch {}

  }

  const res = await fetch(`${API_BASE}/users`, {
    method: "POST"
  });

  const user = await res.json();

  const userId = user.id;
  

  await chrome.storage.local.set({ userId });

  console.log("Created new user:", userId);

  return userId;
}




async function ensureAgents(userId) {

  const res = await fetch(`${API_BASE}/agents/${userId}`);

  const agents = await res.json();

  if (!agents || agents.length === 0) {
    console.error("No agents returned from backend");
    return;
  }

  // Save full agent list
  await chrome.storage.local.set({ agents });

  // Find default agents
  const inbox = agents.find(a => a.type === "system_inbox");
  const general = agents.find(a => a.type === "general");

  await chrome.storage.local.set({

    inboxAgentId: inbox?.id || null,

    generalAgentId: general?.id || null,

    // Set inbox as default active agent
    activeAgent: inbox?.id || general?.id

  });

  console.log("Agents initialised:", agents.length);

}



// ======================================================
// INITIALISE IDENTITY (RUNS ONLY ONCE)
// ======================================================
async function initIdentity() {

  if (initPromise) return initPromise;

  initPromise = (async () => {

    const userId = await ensureUser();

    await ensureAgents(userId);

    console.log("Identity fully initialised");

  })();

  return initPromise;

}



// ======================================================
// HANDLE SAVE PAGE
// ======================================================
async function handleSavePage(tabId) {

  await initIdentity();

  try {

    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"],
    });

  } catch (err) {

    console.error("Script injection failed:", err);

  }

}



// ======================================================
// HANDLE PAGE CAPTURED → SEND TO BACKEND
// ======================================================
async function handlePageCaptured(message) {

  await initIdentity();

  const { content, title, url } = message;

  const storage = await chrome.storage.local.get([
    "userId",
    "activeAgent"
  ]);

  const userId = storage.userId;
  const agentId = storage.activeAgent;

  if (!userId) {
    console.error("No userId found");
    return;
  }

  if (!agentId) {
    console.error("No activeAgent found");
    return;
  }

  try {

    await fetch(`${API_BASE}/ingest_page`, {

      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({

        user_id: userId,
        agent_id: agentId,
        url,
        title,
        content

      })

    });

    console.log("Page ingested successfully");

  } catch (err) {

    console.error("Ingest failed:", err);

  }

}



// ======================================================
// MESSAGE LISTENER
// ======================================================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  if (message.action === "INIT_IDENTITY") {

    initIdentity();

  }

  if (message.action === "Save_Page") {

    handleSavePage(message.tabId);

  }

  if (message.action === "Page_Captured") {

    handlePageCaptured(message);

  }

  return true;

});



// ======================================================
// STARTUP INITIALISATION
// ======================================================
chrome.runtime.onInstalled.addListener(() => {
  initIdentity();
});

chrome.runtime.onStartup.addListener(() => {
  initIdentity();
});



