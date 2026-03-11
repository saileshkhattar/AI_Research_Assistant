import { ChatContext } from "./ChatContext";

import { useState, useEffect } from "react";

import { chromeStorage } from "../../services/chromeStorage.js";

import { ChatAPI, MessageAPI } from "../../services/api.js";
import { useAgentContext } from "../Agent/useAgentContext.js";

export function ChatProvider({ children }) {
  const { activeAgentId, userId } = useAgentContext();
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!activeAgentId) return;

    const loadChats = async () => {
      try {
        const backendChats = await ChatAPI.getChatsByAgent(
          activeAgentId,
          userId,
        );

        setChats(backendChats);

        const result = await chromeStorage.get(["activeChatId"]);
        const storedChatId = result.activeChatId;

        const chatId =
          storedChatId && backendChats.find((c) => c.id === storedChatId)
            ? storedChatId
            : backendChats[0]?.id;

        if (chatId) {
          setActiveChatId(chatId);
          await chromeStorage.set({ activeChatId: chatId });
        }

        setIsLoaded(true);
      } catch (err) {
        console.error("Failed loading chats:", err);
      }
    };

    loadChats();
  }, [activeAgentId, userId]);

  /*
    Load messages from backend — passes userId for ownership check
  */
  useEffect(() => {
    if (!activeChatId || !userId) return;

    const loadMessages = async () => {
      try {
        const backendMessages = await MessageAPI.getMessages(
          activeChatId,
          userId,
        );

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

  /*
    Set active chat — clears messages so stale messages don't flash
  */
  const setActiveChat = async (chatId) => {
    setMessages([]);
    setActiveChatId(chatId);

    await chromeStorage.set({ activeChatId: chatId });
  };

  /*
    Called by useMessages after backend auto-creates a new chat.
    Saves the returned chat_id and adds the chat to the sidebar list.
  */
  const onChatCreated = async (chat) => {
    setChats((prev) => [chat, ...prev]);
    setActiveChatId(chat.id);
    await chromeStorage.set({ activeChatId: chat.id });
  };

  /*
    Start a brand new chat — clears messages and activeChatId.
    The next sendMessage will hit backend with chat_id: null
    and backend will auto-create one, returning it via X-Chat-Id header.
  */
  const startNewChat = async () => {
    setMessages([]);
    setActiveChatId(null);
    await chromeStorage.remove("activeChatId");
  };

  /*
    Add a chat locally (e.g. optimistic insert before backend confirms)
  */
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
        setActiveChat,
        onChatCreated,
        startNewChat,

        messages,
        setMessages,

        isLoaded,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}
