import { Box, Typography } from "@mui/material";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import { useMessages } from "../../hooks/useMessages";
import { useChats } from "../../hooks/useChats";
import { useAgents } from "../../hooks/useAgents";
import { useEffect, useRef } from "react";
import { chromeStorage } from "../../services/chromeStorage";

const AGENT_HINTS = {
  general: "General — quick answers to anything. No pages needed.",
  system_inbox: "Inbox — one page per chat. Click a saved page to begin.",
  knowledge: "Knowledge agent — answers strictly from your saved research.",
  custom: "Custom agent — answers strictly from your saved research.",
};

export default function ChatWindow() {
  const { activeChatId, chats, pages, pageFilter, isLoaded } = useChats();
  const { sendMessage, isStreaming } = useMessages();
  const { activeAgentId, agents, setActiveAgent } = useAgents();

  const activeAgent = agents.find((a) => a.id === activeAgentId);
  const activeChat = chats.find((c) => c.id === activeChatId);

  const isInbox = activeAgent?.type === "system_inbox";
  const isGeneral = activeAgent?.type === "general";

  const scopedPageId = isInbox
    ? (activeChat?.page_id ?? pageFilter ?? null)
    : null;
  const scopedPage = scopedPageId
    ? pages.find((p) => p.id === scopedPageId)
    : null;

  // Inbox guard: no page selected at all yet (nothing to chat about)
  const inboxNeedsPage = isInbox && !scopedPageId;

  const handleSend = async (text) => {
    const pageId = isInbox ? scopedPageId : (activeChat?.page_id ?? null);
    await sendMessage(activeChatId, text, pageId);
  };

  const pendingQueryHandled = useRef(false);

  useEffect(() => {
    if (!isLoaded || pendingQueryHandled.current) return;

    (async () => {
      const { pendingQuery } = await chromeStorage.getSession("pendingQuery");
      if (!pendingQuery) {
        pendingQueryHandled.current = true;
        return;
      }

      if (pendingQuery.agentId && pendingQuery.agentId !== activeAgentId) {
        await setActiveAgent(pendingQuery.agentId);
        return;
      }

      pendingQueryHandled.current = true;
      await chromeStorage.removeSession("pendingQuery");
      if (pendingQuery.question) await handleSend(pendingQuery.question);
    })();
  }, [isLoaded, activeAgentId]);

  if (!activeAgentId) {
    return (
      <EmptyState>
        {agents.length === 0
          ? "Create an agent to get started."
          : "Select an agent."}
      </EmptyState>
    );
  }

  return (
    <Box
      display="flex"
      flexDirection="column"
      height="100%"
      sx={{ backgroundColor: "#0e0e11" }}
    >
      {/* Agent type hint strip */}
      <Box
        sx={{
          px: 2.5,
          py: 0.75,
          borderBottom: "1px solid #1e1e27",
          display: "flex",
          alignItems: "center",
          gap: 1,
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            flexShrink: 0,
            backgroundColor: isGeneral
              ? "#7a7a90"
              : isInbox
                ? "#a78bfa"
                : "#00d4ff",
          }}
        />
        <Typography
          sx={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "0.65rem",
            color: "#4a4a60",
            letterSpacing: "0.04em",
          }}
        >
          {AGENT_HINTS[activeAgent?.type] ?? ""}
        </Typography>
      </Box>

      {/* "Chatting with: <page>" pill — makes the single-page scope obvious
          at a glance instead of relying on the sidebar highlight alone */}
      {isInbox && scopedPage && (
        <Box sx={{ px: 2.5, pt: 1, flexShrink: 0 }}>
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.75,
              maxWidth: "100%",
              px: 1.25,
              py: 0.5,
              borderRadius: "999px",
              backgroundColor: "rgba(167,139,250,0.1)",
              border: "1px solid rgba(167,139,250,0.3)",
            }}
          >
            <ArticleOutlinedIcon
              sx={{ fontSize: 13, color: "#a78bfa", flexShrink: 0 }}
            />
            <Typography
              noWrap
              sx={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "0.68rem",
                color: "#c4b5fd",
              }}
            >
              Chatting with:{" "}
              <Box component="span" sx={{ color: "#e8e0ff" }}>
                {scopedPage.title?.trim() ||
                  scopedPage.display_url ||
                  scopedPage.url}
              </Box>
            </Typography>
          </Box>
        </Box>
      )}

      {/* Inbox needs a page selected */}
      {inboxNeedsPage ? (
        <Box
          flex={1}
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          sx={{
            opacity: 0.45,
            userSelect: "none",
            gap: 1.5,
            px: 4,
            textAlign: "center",
          }}
        >
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: "1px solid #2a2a35",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: "#2a2a35",
              }}
            />
          </Box>
          <Typography
            sx={{
              fontFamily: "'Syne', sans-serif",
              fontSize: "0.85rem",
              color: "#4a4a60",
              letterSpacing: "0.04em",
              lineHeight: 1.6,
            }}
          >
            Click a saved page in the sidebar{"\n"}to start a focused chat about
            it.
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
    <Box
      display="flex"
      alignItems="center"
      justifyContent="center"
      height="100%"
      sx={{ backgroundColor: "#0e0e11" }}
    >
      <Typography
        sx={{
          fontFamily: "'Syne', sans-serif",
          fontSize: "0.85rem",
          color: "#4a4a60",
          letterSpacing: "0.06em",
          opacity: 0.5,
        }}
      >
        {children}
      </Typography>
    </Box>
  );
}
