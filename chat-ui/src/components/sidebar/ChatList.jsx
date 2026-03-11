import {
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemText,
} from "@mui/material";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";

import { useChats } from "../../hooks/useChats";

export default function ChatList() {
  const { chats, activeChatId, setActiveChat } = useChats();

  const handleChatClick = (chatId) => {
    setActiveChat(chatId);
  };

  return (
    <Box sx={{ flex: 1, overflowY: "auto", p: 1.5 }}>
      <Typography
        variant="overline"
        sx={{
          px: 1,
          mb: 0.5,
          display: "block",
          fontSize: "0.65rem",
          letterSpacing: "0.12em",
          color: "#4a4a60",
          fontFamily: "'Syne', sans-serif",
          fontWeight: 600,
        }}
      >
        Chats
      </Typography>

      <List dense disablePadding>
        {chats.map((chat) => (
          <ListItemButton
            key={chat.id}
            selected={chat.id === activeChatId}
            onClick={() => handleChatClick(chat.id)}
            sx={{
              borderRadius: "6px",
              mb: 0.25,
              py: 0.75,
              px: 1,
              gap: 1,
              transition: "all 0.15s",
              "&:hover": {
                backgroundColor: "#1a1a20",
                "& .chat-title": { color: "#e8e8f0" },
              },
              "&.Mui-selected": {
                backgroundColor: "rgba(0,212,255,0.08)",
                borderLeft: "2px solid #00d4ff",
                pl: "calc(8px - 2px)",
                "& .chat-title": { color: "#00d4ff" },
                "&:hover": { backgroundColor: "rgba(0,212,255,0.12)" },
              },
            }}
          >
            <ChatBubbleOutlineIcon
              sx={{
                fontSize: 13,
                color: chat.id === activeChatId ? "#00d4ff" : "#4a4a60",
                flexShrink: 0,
                transition: "color 0.15s",
              }}
            />
            <ListItemText
              primary={chat.title}
              primaryTypographyProps={{
                className: "chat-title",
                sx: {
                  fontFamily: "'Syne', sans-serif",
                  fontSize: "0.82rem",
                  fontWeight: chat.id === activeChatId ? 600 : 400,
                  color: chat.id === activeChatId ? "#00d4ff" : "#7a7a90",
                  transition: "color 0.15s",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                },
              }}
            />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
}
