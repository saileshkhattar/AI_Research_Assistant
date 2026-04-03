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

  /**
   * Send a message and stream the response.
   * @param {string|null} chatId   - existing chat ID, or null to auto-create
   * @param {string}      text     - the user's message
   * @param {string|null} pageId   - page scope (required for inbox chats)
   */
  const sendMessage = async (chatId, text, pageId = null) => {
    if (isStreaming) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMessage]);

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
          user_id:  userId,
          agent_id: activeAgentId,
          chat_id:  chatId  || null,
          question: text,
          page_id:  pageId  || null,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `Server error ${response.status}`);
      }

      const returnedChatId = response.headers.get("X-Chat-Id");
      if (returnedChatId && !chatId) {
        await onChatCreated(returnedChatId);
      }

      const reader  = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId
              ? { ...msg, content: accumulated, streaming: true }
              : msg
          )
        );
      }

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
            ? { ...msg, content: err.message || "Something went wrong. Please try again.", streaming: false }
            : msg
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  return { messages, sendMessage, isStreaming };
}
