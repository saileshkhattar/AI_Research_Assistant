import {
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  Skeleton,
  Button,
} from "@mui/material";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import AddIcon from "@mui/icons-material/Add";
import { useChats } from "../../hooks/useChats";
import { useAgents } from "../../hooks/useAgents";

function formatChatTime(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function ChatList() {
  const {
    chats,
    activeChatId,
    setActiveChat,
    isLoaded,
    isStreaming,
    pageFilter,
    startNewChat,
  } = useChats();
  const { activeAgentId, agents } = useAgents();

  const activeAgent = agents.find((a) => a.id === activeAgentId);
  const isInbox = activeAgent?.type === "system_inbox";

  // Inbox: the Pages list above is a FILTER, not a 1:1 chat picker — a
  // page can have several chats. Nothing to show until a page is chosen,
  // and once one is, only that page's chats are listed.
  if (isInbox && !pageFilter) {
    return (
      <Box sx={{ flex: 1, p: 1.5 }}>
        <SectionLabel>Chats</SectionLabel>
        <Box
          sx={{
            px: 1,
            py: 1,
            fontFamily: "'DM Mono', monospace",
            fontSize: "0.68rem",
            color: "#3a3a50",
            lineHeight: 1.5,
          }}
        >
          Select a page above to view its chats.
        </Box>
      </Box>
    );
  }

  const visibleChats = isInbox
    ? chats.filter((c) => c.page_id === pageFilter)
    : chats;

  return (
    <Box sx={{ flex: 1, overflowY: "auto", p: 1.5 }}>
      <SectionLabel>Chats</SectionLabel>

      {isInbox && (
        <Button
          fullWidth
          size="small"
          startIcon={<AddIcon sx={{ fontSize: 14 }} />}
          onClick={() => !isStreaming && startNewChat()}
          disabled={isStreaming}
          sx={{
            justifyContent: "flex-start",
            mb: 0.75,
            py: 0.5,
            px: 1,
            fontFamily: "'Syne', sans-serif",
            fontSize: "0.75rem",
            fontWeight: 500,
            color: "#a78bfa",
            textTransform: "none",
            "&:hover": { backgroundColor: "rgba(167,139,250,0.08)" },
          }}
        >
          New chat about this page
        </Button>
      )}

      {/* Loading skeletons */}
      {!isLoaded && (
        <Box sx={{ px: 1 }}>
          {[1, 2, 3].map((i) => (
            <Skeleton
              key={i}
              variant="rounded"
              height={36}
              sx={{ mb: 0.5, bgcolor: "#22252e" }}
            />
          ))}
        </Box>
      )}

      {/* Empty state */}
      {isLoaded && visibleChats.length === 0 && (
        <Box
          sx={{
            px: 1,
            py: 1,
            fontFamily: "'DM Mono', monospace",
            fontSize: "0.68rem",
            color: "#3a3a50",
          }}
        >
          {isInbox
            ? "No chats yet for this page — send a message to start"
            : "No chats yet — send a message to start"}
        </Box>
      )}

      <List dense disablePadding>
        {visibleChats.map((chat) => {
          const isActive = chat.id === activeChatId;
          return (
            <ListItemButton
              key={chat.id}
              selected={isActive}
              disabled={isStreaming && !isActive}
              onClick={() => !isStreaming && setActiveChat(chat.id)}
              sx={{
                borderRadius: "6px",
                mb: 0.25,
                py: 0.75,
                px: 1,
                gap: 1,
                transition: "all 0.15s",
                "&:hover": {
                  backgroundColor: "#22252e",
                  "& .chat-title": { color: "#f5f7ff" },
                },
                "&.Mui-selected": {
                  backgroundColor: "rgba(0,212,255,0.08)",
                  borderLeft: "2px solid #00d4ff",
                  pl: "calc(8px - 2px)",
                  "& .chat-title": { color: "#00d4ff" },
                  "&:hover": { backgroundColor: "rgba(0,212,255,0.12)" },
                },
                "&.Mui-disabled": { opacity: 0.4 },
              }}
            >
              <ChatBubbleOutlineIcon
                sx={{
                  fontSize: 13,
                  color: isActive ? "#00d4ff" : "#7a8090",
                  flexShrink: 0,
                  transition: "color 0.15s",
                }}
              />
              <ListItemText
                primary={chat.title || "New Chat"}
                secondary={formatChatTime(chat.created_at)}
                primaryTypographyProps={{
                  className: "chat-title",
                  noWrap: true,
                  sx: {
                    fontFamily: "'Syne', sans-serif",
                    fontSize: "0.82rem",
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? "#00d4ff" : "#b0b6c3",
                    transition: "color 0.15s",
                  },
                }}
                secondaryTypographyProps={{
                  sx: {
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "0.62rem",
                    color: "#3a3a50",
                    lineHeight: 1.2,
                    mt: 0.25,
                  },
                }}
              />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );
}

function SectionLabel({ children }) {
  return (
    <Typography
      variant="overline"
      sx={{
        px: 1,
        mb: 0.5,
        display: "block",
        fontSize: "0.65rem",
        letterSpacing: "0.12em",
        color: "#7a8090",
        fontFamily: "'Syne', sans-serif",
        fontWeight: 600,
      }}
    >
      {children}
    </Typography>
  );
}
