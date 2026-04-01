import { ChatContext } from "./ChatContext";
import { useState, useEffect, useCallback } from "react";
import { chromeStorage } from "../../services/chromeStorage.js";
import { ChatAPI, MessageAPI } from "../../services/api.js";
import { useAgentContext } from "../Agent/useAgentContext.js";

export function ChatProvider({ children }) {
  const { activeAgentId, userId } = useAgentContext();
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  // Reload chats whenever the active agent changes, and clear previous state
  useEffect(() => {
    if (!activeAgentId || !userId) return;

    setIsLoaded(false);
    setChats([]);
    setMessages([]);
    setActiveChatId(null);

    const loadChats = async () => {
      try {
        const backendChats = await ChatAPI.getChatsByAgent(activeAgentId, userId);
        setChats(backendChats);

        const result = await chromeStorage.get(["activeChatId"]);
        const storedChatId = result.activeChatId;

        // Restore stored chat only if it belongs to the current agent
        const chatId =
          storedChatId && backendChats.find((c) => c.id === storedChatId)
            ? storedChatId
            : backendChats[0]?.id ?? null;

        setActiveChatId(chatId);
        if (chatId) await chromeStorage.set({ activeChatId: chatId });
      } catch (err) {
        console.error("Failed loading chats:", err);
      } finally {
        setIsLoaded(true);
      }
    };

    loadChats();
  }, [activeAgentId, userId]);

  // Load messages when switching chats
  useEffect(() => {
    if (!activeChatId || !userId) {
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      try {
        const backendMessages = await MessageAPI.getMessages(activeChatId, userId);
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
  const onChatCreated = useCallback(async (chatId) => {
    const newChat = {
      id: chatId,
      title: "New Chat",
      agent_id: activeAgentId,
      user_id: userId,
    };
    setChats((prev) => [newChat, ...prev]);
    setActiveChatId(chatId);
    await chromeStorage.set({ activeChatId: chatId });
  }, [activeAgentId, userId]);

  // Clear active chat — next sendMessage will auto-create a new one
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
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}
