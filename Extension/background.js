const userId = await getUserId();

chrome.runtime.onMessage.addListener(async (messages, sender, sendResponse) => {
  if (messages.action == "Save_Page") {
    const tabId = messages.tabId;
    await chrome.scripting.executeScript({
      target: { tabId },
      files: [content.js],
    });
  }

  if (messages.action == "Page_Captured") {
    const { content, title, url } = messages;

    const { activeAgent } = await chrome.storage.local.get("activeAgent");

    await fetch("http://localhost:8000/ingest_page", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agent: activeAgent,
        user_id: userId,
        url,
        title,
        content,
      }),
    });
  }
});
