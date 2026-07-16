import { Box, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import { useMessages } from "../../hooks/useMessages";
import { useChats } from "../../hooks/useChats";
import { useAgents } from "../../hooks/useAgents";

const AGENT_HINTS = {
  general:      "General — quick answers to anything. No pages needed.",
  system_inbox: "Inbox — one page per chat. Click a saved page to begin.",
  knowledge:    "Knowledge agent — answers strictly from your saved research.",
  custom:       "Custom agent — answers strictly from your saved research.",
};

export default function ChatWindow() {
  const { activeChatId, chats } = useChats();
  const { sendMessage, isStreaming } = useMessages();
  const { activeAgentId, agents } = useAgents();

  // pendingPageId: set when the user clicks a page in Inbox mode before
  // any chat exists for that page. Cleared when a chat is created.
  const [pendingPageId, setPendingPageId] = useState(null);
  const pendingRef = useRef(null);

  const activeAgent = agents.find((a) => a.id === activeAgentId);
  const activeChat  = chats.find((c) => c.id === activeChatId);

  const isInbox   = activeAgent?.type === "system_inbox";
  const isGeneral = activeAgent?.type === "general";

  // Listen for PageList dispatching which page was clicked in inbox mode
  useEffect(() => {
    const handler = (e) => {
      setPendingPageId(e.detail.pageId);
      pendingRef.current = e.detail.pageId;
    };
    window.addEventListener("inbox-page-selected", handler);
    return () => window.removeEventListener("inbox-page-selected", handler);
  }, []);

  // Inbox guard: no active chat and no page has been clicked yet
  const inboxNeedsPage = isInbox && !activeChatId && !pendingPageId;

  const handleSend = async (text) => {
    // For inbox chats: resolve the page_id to send
    //   - existing chat → use chat's stored page_id
    //   - new chat      → use the pending page the user just clicked
    // For all other agents: pass through chat's page_id if any (usually null)
    const pageId = isInbox
      ? (activeChat?.page_id ?? pendingRef.current ?? null)
      : (activeChat?.page_id ?? null);

    await sendMessage(activeChatId, text, pageId);
  };

  if (!activeAgentId) {
    return (
      <EmptyState>
        {agents.length === 0 ? "Create an agent to get started." : "Select an agent."}
      </EmptyState>
    );
  }

  return (
    <Box display="flex" flexDirection="column" height="100%" sx={{ backgroundColor: "#0e0e11" }}>

      {/* Agent type hint strip */}
      <Box
        sx={{
          px: 2.5, py: 0.75,
          borderBottom: "1px solid #1e1e27",
          display: "flex", alignItems: "center", gap: 1,
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
            backgroundColor: isGeneral ? "#7a7a90" : isInbox ? "#a78bfa" : "#00d4ff",
          }}
        />
        <Typography
          sx={{ fontFamily: "'DM Mono', monospace", fontSize: "0.65rem", color: "#4a4a60", letterSpacing: "0.04em" }}
        >
          {AGENT_HINTS[activeAgent?.type] ?? ""}
          {isInbox && pendingPageId && !activeChatId && (
            <Box component="span" sx={{ color: "#a78bfa", ml: 1 }}>
              · page selected, send a message to start
            </Box>
          )}
        </Typography>
      </Box>

      {/* Inbox needs a page selected */}
      {inboxNeedsPage ? (
        <Box
          flex={1}
          display="flex" flexDirection="column"
          alignItems="center" justifyContent="center"
          sx={{ opacity: 0.45, userSelect: "none", gap: 1.5, px: 4, textAlign: "center" }}
        >
          <Box
            sx={{
              width: 40, height: 40, borderRadius: "50%",
              border: "1px solid #2a2a35",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#2a2a35" }} />
          </Box>
          <Typography
            sx={{
              fontFamily: "'Syne', sans-serif", fontSize: "0.85rem",
              color: "#4a4a60", letterSpacing: "0.04em", lineHeight: 1.6,
            }}
          >
            Click a saved page in the sidebar{"\n"}to start a focused chat about it.
          </Typography>
        </Box>
      ) : (
        <Box flex={1} sx={{ overflow: "hidden" }}>
          <MessageList />
        </Box>
      )}

      <MessageInput
        onSend={handleSend}
        isStreaming={isStreaming}
        disabled={inboxNeedsPage}
        placeholder={
          inboxNeedsPage
            ? "Select a page from the sidebar first…"
            : isInbox
            ? "Ask about this page…"
            : isGeneral
            ? "Ask anything…"
            : "Ask your knowledge base…"
        }
      />
    </Box>
  );
}

function EmptyState({ children }) {
  return (
    <Box display="flex" alignItems="center" justifyContent="center" height="100%" sx={{ backgroundColor: "#0e0e11" }}>
      <Typography sx={{ fontFamily: "'Syne', sans-serif", fontSize: "0.85rem", color: "#4a4a60", letterSpacing: "0.06em", opacity: 0.5 }}>
        {children}
      </Typography>
    </Box>
  );
}
