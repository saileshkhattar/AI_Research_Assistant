// content.js — injected into the active tab when user clicks "Save Page"
// Extracts visible text, title, and URL then sends to background.js

(function () {
  // Avoid double-injection if the script runs twice on the same page
  if (window.__researchAiInjected) return;
  window.__researchAiInjected = true;

  // Strip script/style nodes and grab visible text, max 30k chars
  const clone = document.body.cloneNode(true);
  clone.querySelectorAll("script, style, noscript, iframe").forEach((el) => el.remove());
  const content = (clone.innerText || clone.textContent || "").trim().slice(0, 30000);

  const title = document.title || document.location.hostname;
  const url   = window.location.href;

  chrome.runtime.sendMessage({
    action: "Page_Captured",
    content,
    title,
    url,
  });
})();
