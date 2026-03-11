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

    isLoaded,
  };
}
