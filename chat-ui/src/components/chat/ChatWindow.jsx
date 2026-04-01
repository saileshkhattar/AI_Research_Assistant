import { Box, Typography } from "@mui/material";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import { useMessages } from "../../hooks/useMessages";
import { useChats } from "../../hooks/useChats";
import { useAgents } from "../../hooks/useAgents";

export default function ChatWindow() {
  const { activeChatId } = useChats();
  const { sendMessage, isStreaming } = useMessages();
  const { activeAgentId, agents } = useAgents();

  const handleSend = async (text) => {
    await sendMessage(activeChatId, text);
  };

  // No agent loaded yet
  if (!activeAgentId) {
    return (
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        height="100%"
        sx={{ backgroundColor: "#0e0e11" }}
      >
        <Box sx={{ textAlign: "center", opacity: 0.4 }}>
          <Typography
            sx={{
              fontFamily: "'Syne', sans-serif",
              fontSize: "0.85rem",
              color: "#4a4a60",
              letterSpacing: "0.06em",
            }}
          >
            {agents.length === 0 ? "Create an agent to get started" : "Select an agent"}
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      display="flex"
      flexDirection="column"
      height="100%"
      sx={{ backgroundColor: "#0e0e11" }}
    >
      <Box flex={1} sx={{ overflow: "hidden" }}>
        <MessageList />
      </Box>
      <MessageInput onSend={handleSend} isStreaming={isStreaming} />
    </Box>
  );
}
