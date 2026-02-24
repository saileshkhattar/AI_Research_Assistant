import { useChatContext } from "../context/ChatsContext";
import { useAgentContext } from "../context/AgentsContext";

export function useMessages() {
  const { messages, setMessages } = useChatContext();

  const { userId, activeAgentId } = useAgentContext();

  const sendMessage = async (chatId, text) => {
    // -----------------------------
    // Add user message instantly
    // -----------------------------
    const userMessage = {
      role: "user",
      content: text,
    };

    setMessages((prev) => [...prev, userMessage]);

    // -----------------------------
    // Create empty assistant message
    // -----------------------------
    let assistantMessage = {
      role: "assistant",
      content: "",
    };

    setMessages((prev) => [...prev, assistantMessage]);

    try {
      const response = await fetch("http://localhost:8000/query/stream", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          user_id: userId,
          agent_id: activeAgentId,
          chat_id: chatId,
          question: text,
          page_id: null,
        }),
      });

      const reader = response.body.getReader();

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value);

        assistantMessage.content += chunk;

        // Update last assistant message live
        setMessages((prev) => {
          const updated = [...prev];

          updated[updated.length - 1] = {
            ...assistantMessage,
          };

          return updated;
        });
      }
    } catch (err) {
      console.error("Streaming error:", err);
    }
  };

  return {
    messages,
    sendMessage,
  };
}
