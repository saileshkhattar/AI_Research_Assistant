import { useChatContext } from "../context/ChatsContext";
import { useAgentContext } from "../context/AgentsContext";
import { QueryAPI } from "../services/api.js";

export function useMessages() {

  const {
    messages,
    setMessages
  } = useChatContext();

  const {
    userId,
    activeAgentId
  } = useAgentContext();

  const sendMessage = async (
    chatId,
    text
  ) => {

    // Add user message instantly
    const userMessage = {
      role: "user",
      content: text
    };

    setMessages(prev => [
      ...prev,
      userMessage
    ]);

    try {

      const response =
        await QueryAPI.query({
          user_id: userId,
          agent_id: activeAgentId,
          chat_id: chatId,
          message: text
        });

      const assistantMessage = {
        role: "assistant",
        content: response.answer
      };

      setMessages(prev => [
        ...prev,
        assistantMessage
      ]);

    } catch (err) {

      console.error(err);

    }

  };

  return {

    messages,
    sendMessage

  };

}