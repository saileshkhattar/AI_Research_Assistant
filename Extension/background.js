const API_BASE = "http://127.0.0.1:8000";

function isHttpUrl(url) {
  return /^https?:\/\//i.test(url || "");
}

const processedTabs = new Set();

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {

  if (changeInfo.status !== "complete") return;
  if (!tab.url || !isHttpUrl(tab.url)) return;

  if (processedTabs.has(tabId)) return;
  processedTabs.add(tabId);

  try {
    console.log("erferfwe")
    const response = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        return {
          title: document.title || "",
          content: document.body?.innerText?.slice(0, 30000) || "",
        };
      }
    });



    if (!response || !response[0]) return;

    const { title, content } = response[0].result;
    console.log(title, content)

    if (!content.trim()) return;

    await fetch(`${API_BASE}/ingest_page`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: tab.url,
        title,
        content
      })
    });

    console.log("Auto-ingested:", tab.url);

  } catch (err) {
    console.error("Auto ingest failed:", err);
  }

  setTimeout(() => processedTabs.delete(tabId), 5000);
});
