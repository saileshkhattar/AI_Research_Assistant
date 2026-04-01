import { Box } from "@mui/material";
import AgentDropdown from "./AgentDropdown";
import NewAgentButton from "./NewAgentButton";
import ChatList from "./ChatList";
import NewChatButton from "./NewChatButton";
import PageList from "./PageList";

export default function Sidebar() {
  return (
    <Box
      sx={{
        width: 220,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#0a0a0d",
        borderRight: "1px solid #1e1e27",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      {/* Agent selector */}
      <Box sx={{ p: 1.5, borderBottom: "1px solid #1e1e27" }}>
        <AgentDropdown />
      </Box>

      {/* Saved pages for this agent */}
      <Box sx={{ borderBottom: "1px solid #1e1e27" }}>
        <PageList />
      </Box>

      {/* Chat list — takes remaining height */}
      <ChatList />

      {/* New chat button */}
      <NewChatButton />

      {/* New agent button */}
      <NewAgentButton />
    </Box>
  );
}