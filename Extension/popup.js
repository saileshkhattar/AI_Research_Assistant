// popup.js
// UI ONLY — background.js owns identity and ingestion

const els = {
  saveCurrentPage: document.getElementById("savePageBtn"),
  status: document.getElementById("status"),
};

// ------------------------------
// INIT
// ------------------------------
document.addEventListener("DOMContentLoaded", async () => {

  attachEvents();

  // Tell background to initialise identity (user + agents)
  chrome.runtime.sendMessage({ action: "INIT_IDENTITY" });

});


// ------------------------------
// EVENTS
// ------------------------------
function attachEvents() {

  if (els.saveCurrentPage) {
    els.saveCurrentPage.addEventListener("click", savePageHandler);
  }

}


// ------------------------------
// SAVE PAGE
// ------------------------------
async function savePageHandler() {

  try {

    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab?.id) {
      els.status.textContent = "No active tab";
      return;
    }

    chrome.runtime.sendMessage({
      action: "Save_Page",
      tabId: tab.id,
    });

    els.status.textContent = "Saving page...";

  } catch (err) {

    console.error(err);
    els.status.textContent = "Save failed";

  }

}


