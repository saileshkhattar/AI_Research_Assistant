import { useChatContext } from "../context/Chat/useChatContext.js";
import { useAgentContext } from "../context/Agent/useAgentContext.js";

export function useMessages() {
  const { messages, setMessages, setActiveChatId } = useChatContext();
  const { userId, activeAgentId } = useAgentContext();

  const sendMessage = async (chatId, text) => {
    // Optimistically add user message to UI
    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMessage]);
    console.log("Tryoing againnnn");
    // Add empty assistant bubble for streaming
    const assistantId = `assistant-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "" },
    ]);

    try {
      const response = await fetch("http://localhost:8000/query/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          agent_id: activeAgentId,
          chat_id: chatId || null, // null = backend will auto-create a new chat
          question: text,
          page_id: null,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      // -------------------------------------------------------
      // If backend created a new chat, it returns the ID in the
      // X-Chat-Id header — save it so all future messages in
      // this session reuse the same chat.
      // -------------------------------------------------------
      const returnedChatId = response.headers.get("X-Chat-Id");

      if (returnedChatId && !chatId) {
        console.log("New chat created by backend:", returnedChatId);
        setActiveChatId(returnedChatId); // save in context + chrome storage
      }

      // Stream the response tokens
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId ? { ...msg, content: accumulated } : msg,
          ),
        );
      }
    } catch (err) {
      console.error("Streaming error:", err);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantId
            ? { ...msg, content: "Something went wrong. Please try again." }
            : msg,
        ),
      );
    }
  };

  return {
    messages,
    sendMessage,
  };
}
