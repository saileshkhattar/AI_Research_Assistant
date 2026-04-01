export const chromeStorage = {
  get: (keys) =>
    new Promise((resolve) => {
      chrome.storage.local.get(keys, (result) => {
        resolve(result);
      });
    }),

  set: (data) =>
    new Promise((resolve) => {
      chrome.storage.local.set(data, resolve);
    }),

  // Was missing — ChatProvider.startNewChat() calls this to clear activeChatId
  remove: (keys) =>
    new Promise((resolve) => {
      chrome.storage.local.remove(keys, resolve);
    }),
};
