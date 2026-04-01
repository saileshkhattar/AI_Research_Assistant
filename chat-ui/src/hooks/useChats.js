import { useChatContext } from "../context/Chat/useChatContext.js";

export function useChats() {
  const {
    chats,
    setChats,
    addChat,
    activeChatId,
    setActiveChat,
    onChatCreated,
    startNewChat,
    messages,
    setMessages,
    isStreaming,
    isLoaded,
  } = useChatContext();

  return {
    chats,
    setChats,
    addChat,
    activeChatId,
    setActiveChat,
    onChatCreated,
    startNewChat,
    messages,
    setMessages,
    isStreaming,
    isLoaded,
  };
}
