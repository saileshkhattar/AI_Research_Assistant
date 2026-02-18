const content = document.body.innerText.slice(0, 30000);
const title = document.title;
const url = window.location.href;

console.log("this is here")

chrome.runtime.sendMessage({
  action: "Page_Captured",
  content,
  title,
  url,
});
