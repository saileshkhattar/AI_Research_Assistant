import { useChatContext } from "../context/Chat/useChatContext.js";
import { useAgentContext } from "../context/Agent/useAgentContext.js";

export function useMessages() {
  const {
    messages,
    setMessages,
    onChatCreated,
    isStreaming,
    setIsStreaming,
  } = useChatContext();
  const { userId, activeAgentId } = useAgentContext();

  const sendMessage = async (chatId, text) => {
    if (isStreaming) return; // prevent double-send during stream

    // Optimistic user message
    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMessage]);

    // Placeholder assistant bubble — content filled in by streaming
    const assistantId = `assistant-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "", streaming: true },
    ]);

    setIsStreaming(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/query/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          agent_id: activeAgentId,
          chat_id: chatId || null,
          question: text,
          page_id: null,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      // If the backend auto-created a new chat, add it to the sidebar
      const returnedChatId = response.headers.get("X-Chat-Id");
      if (returnedChatId && !chatId) {
        await onChatCreated(returnedChatId);
      }

      // Stream tokens into the assistant bubble
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
            msg.id === assistantId
              ? { ...msg, content: accumulated, streaming: true }
              : msg
          )
        );
      }

      // Mark streaming done on the assistant message
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantId ? { ...msg, streaming: false } : msg
        )
      );
    } catch (err) {
      console.error("Streaming error:", err);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantId
            ? { ...msg, content: "Something went wrong. Please try again.", streaming: false }
            : msg
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  return {
    messages,
    sendMessage,
    isStreaming,
  };
}
