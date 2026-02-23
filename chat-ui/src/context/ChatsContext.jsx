import { createContext, useContext, useState, useEffect } from "react";

import { chromeStorage } from "../services/chromeStorage";

import { ChatAPI, MessageAPI } from "../services/api.js";

import { useAgentContext } from "./AgentsContext";

const ChatContext = createContext();


export function ChatProvider({ children }) {

  const { activeAgentId } = useAgentContext();

  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);


  /*
    Load chats when agent changes
  */
  useEffect(() => {

    if (activeAgentId) {
      loadChats(activeAgentId);
    }

  }, [activeAgentId]);


  /*
    Load messages when chat changes
  */
  useEffect(() => {

    if (activeChatId) {
      loadMessages(activeChatId);
    }

  }, [activeChatId]);


  /*
    Load chats from backend
  */
  const loadChats = async (agentId) => {

    try {

      const backendChats =
        await ChatAPI.getChatsByAgent(agentId);

      setChats(backendChats);


      const result =
        await chromeStorage.get(["activeChatId"]);

      const storedChatId = result.activeChatId;


      const chatId =
        storedChatId &&
        backendChats.find(c => c.id === storedChatId)
          ? storedChatId
          : backendChats[0]?.id;


      if (chatId) {

        setActiveChatId(chatId);

        await chromeStorage.set({
          activeChatId: chatId
        });

      }

    } catch (err) {

      console.error("Failed loading chats:", err);

    }

    setIsLoaded(true);

  };


  /*
    Load messages from backend
  */
  const loadMessages = async (chatId) => {

    try {

      const backendMessages =
        await MessageAPI.getMessages(chatId);

      setMessages(backendMessages);

    } catch (err) {

      console.error("Failed loading messages:", err);

    }

  };


  /*
    Set active chat
  */
  const setActiveChat = async (chatId) => {

    setActiveChatId(chatId);

    await chromeStorage.set({
      activeChatId: chatId
    });

  };


  /*
    Create new chat locally (backend version comes later)
  */
  const addChat = (chat) => {

    setChats(prev => [chat, ...prev]);

  };


  return (

    <ChatContext.Provider
      value={{

        chats,
        setChats,
        addChat,

        activeChatId,
        setActiveChat,

        messages,
        setMessages,

        isLoaded

      }}
    >

      {children}

    </ChatContext.Provider>

  );

}

export function useChatContext() {

  return useContext(ChatContext);

}

