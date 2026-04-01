import {
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  Skeleton,
} from "@mui/material";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import { useChats } from "../../hooks/useChats";

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
  const { chats, activeChatId, setActiveChat, isLoaded, isStreaming } = useChats();

  return (
    <Box sx={{ flex: 1, overflowY: "auto", p: 1.5 }}>
      <Typography
        variant="overline"
        sx={{
          px: 1, mb: 0.5, display: "block",
          fontSize: "0.65rem", letterSpacing: "0.12em",
          color: "#4a4a60", fontFamily: "'Syne', sans-serif", fontWeight: 600,
        }}
      >
        Chats
      </Typography>

      {/* Loading skeletons */}
      {!isLoaded && (
        <Box sx={{ px: 1 }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" height={36} sx={{ mb: 0.5, bgcolor: "#1a1a20" }} />
          ))}
        </Box>
      )}

      {/* Empty state */}
      {isLoaded && chats.length === 0 && (
        <Box sx={{ px: 1, py: 1, fontFamily: "'DM Mono', monospace", fontSize: "0.68rem", color: "#3a3a50" }}>
          No chats yet — send a message to start
        </Box>
      )}

      <List dense disablePadding>
        {chats.map((chat) => {
          const isActive = chat.id === activeChatId;
          return (
            <ListItemButton
              key={chat.id}
              selected={isActive}
              disabled={isStreaming && !isActive}
              onClick={() => !isStreaming && setActiveChat(chat.id)}
              sx={{
                borderRadius: "6px",
                mb: 0.25, py: 0.75, px: 1, gap: 1,
                transition: "all 0.15s",
                "&:hover": { backgroundColor: "#1a1a20", "& .chat-title": { color: "#e8e8f0" } },
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
                  color: isActive ? "#00d4ff" : "#4a4a60",
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
                    color: isActive ? "#00d4ff" : "#7a7a90",
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
