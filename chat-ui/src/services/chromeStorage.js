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

  getSession: (keys) => new Promise((resolve) => chrome.storage.session.get(keys, resolve)),
  setSession: (data) => new Promise((resolve) => chrome.storage.session.set(data, resolve)),
  removeSession: (keys) => new Promise((resolve) => chrome.storage.session.remove(keys, resolve)),
};
