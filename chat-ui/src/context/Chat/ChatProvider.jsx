import { ChatContext } from "./ChatContext";
import { useState, useEffect, useCallback } from "react";
import { chromeStorage } from "../../services/chromeStorage.js";
import { AgentAPI, ChatAPI, MessageAPI } from "../../services/api.js";
import { useAgentContext } from "../Agent/useAgentContext.js";

export function ChatProvider({ children }) {
  const { activeAgentId, userId } = useAgentContext();
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  // Saved pages for the active agent, and which page (if any) is currently
  // selected — used to filter the Inbox chat list down to that page's
  // chats, and as the page_id for the NEXT auto-created chat when starting
  // a fresh one. Replaces the old "inbox-page-selected" window CustomEvent
  // with real shared state.
  const [pages, setPages] = useState([]);
  const [pagesLoaded, setPagesLoaded] = useState(false);
  const [pageFilter, setPageFilter] = useState(null);

  const refreshPages = useCallback(async () => {
    if (!activeAgentId) return;
    try {
      const backendPages = await AgentAPI.getAgentUrls(activeAgentId);
      setPages(backendPages);
    } catch (err) {
      console.error("Failed loading pages:", err);
    } finally {
      setPagesLoaded(true);
    }
  }, [activeAgentId]);

  // Reload chats + pages whenever the active agent changes, and clear
  // previous state (including any page filter — it's scoped to one agent).
  useEffect(() => {
    if (!activeAgentId || !userId) return;

    setIsLoaded(false);
    setChats([]);
    setMessages([]);
    setActiveChatId(null);
    setPages([]);
    setPagesLoaded(false);
    setPageFilter(null);

    const loadChats = async () => {
      try {
        const backendChats = await ChatAPI.getChatsByAgent(activeAgentId);
        setChats(backendChats);

        const result = await chromeStorage.get(["activeChatId"]);
        const storedChatId = result.activeChatId;

        // Restore stored chat only if it belongs to the current agent
        const chatId =
          storedChatId && backendChats.find((c) => c.id === storedChatId)
            ? storedChatId
            : (backendChats[0]?.id ?? null);

        setActiveChatId(chatId);
        if (chatId) await chromeStorage.set({ activeChatId: chatId });
      } catch (err) {
        console.error("Failed loading chats:", err);
      } finally {
        setIsLoaded(true);
      }
    };

    loadChats();
    refreshPages();
  }, [activeAgentId, userId, refreshPages]);

  // Load messages when switching chats
  useEffect(() => {
    if (!activeChatId || !userId) {
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      try {
        const backendMessages = await MessageAPI.getMessages(activeChatId);
        const normalised = backendMessages.map((m) => ({
          ...m,
          id: m.id ?? `loaded-${m.role}-${m.created_at}`,
        }));
        setMessages(normalised);
      } catch (err) {
        console.error("Failed loading messages:", err);
      }
    };

    loadMessages();
  }, [activeChatId, userId]);

  // Switch to an existing chat — clear messages first to prevent flashing
  const setActiveChat = async (chatId) => {
    setMessages([]);
    setActiveChatId(chatId);
    await chromeStorage.set({ activeChatId: chatId });
  };

  // Called by useMessages when the backend auto-creates a new chat.
  // Receives the raw chat_id string from the X-Chat-Id response header.
  const onChatCreated = useCallback(
    async (chatId) => {
      const newChat = {
        id: chatId,
        title: "New Chat",
        agent_id: activeAgentId,
        user_id: userId,
        page_id: pageFilter ?? null,
      };
      setChats((prev) => [newChat, ...prev]);
      setActiveChatId(chatId);
      await chromeStorage.set({ activeChatId: chatId });
    },
    [activeAgentId, userId, pageFilter],
  );

  // Clear active chat — next sendMessage will auto-create a new one.
  // Deliberately does NOT touch pageFilter: this is also how "+ New chat
  // about this page" starts another chat scoped to the same page.
  const startNewChat = async () => {
    setMessages([]);
    setActiveChatId(null);
    await chromeStorage.remove("activeChatId");
  };

  const addChat = (chat) => {
    setChats((prev) => [chat, ...prev]);
  };

  return (
    <ChatContext.Provider
      value={{
        chats,
        setChats,
        addChat,

        activeChatId,
        setActiveChatId, // exposed so useMessages can call it
        setActiveChat,
        onChatCreated,
        startNewChat,

        messages,
        setMessages,

        isStreaming,
        setIsStreaming,

        isLoaded,

        pages,
        setPages,
        pagesLoaded,
        refreshPages,
        pageFilter,
        setPageFilter,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}
