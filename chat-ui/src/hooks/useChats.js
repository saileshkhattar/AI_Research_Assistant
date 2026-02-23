import { useChatContext } from "../context/ChatsContext";

export function useChats() {

  const {
    chats,
    setChats,
    activeChatId,
    setActiveChat
  } = useChatContext();

  return {
    chats,
    setChats,
    activeChatId,
    setActiveChat
  };

}