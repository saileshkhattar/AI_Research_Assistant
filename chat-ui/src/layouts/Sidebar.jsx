import { Box } from "@mui/material";
import AgentDropdown from "../components/agents/AgentDropdown";
import NewAgentButton from "../components/agents/NewAgentButton";
import ChatList from "../components/sidebar/ChatList";
import NewChatButton from "../components/sidebar/NewChatButton";
import PageList from "../components/sidebar/PageList";
import AccountSettings from "../components/settings/AccountSettings";
import { useAgents } from "../hooks/useAgents";

export default function Sidebar() {
  const { activeAgentId, agents } = useAgents();
  const activeAgent = agents.find((a) => a.id === activeAgentId);
  const isGeneral = activeAgent?.type === "general";

  return (
    <Box
      sx={{
        width: 220,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#0a0a0d",
        borderRight: "1px solid #2a2f3a",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      {/* Agent selector */}
      <Box sx={{ p: 1.5, borderBottom: "1px solid #2a2f3a" }}>
        <AgentDropdown />
      </Box>

      {/* Saved pages for this agent — General never uses pages, so it's
          hidden entirely rather than shown empty/disabled */}
      {!isGeneral && (
        <Box sx={{ borderBottom: "1px solid #2a2f3a" }}>
          <PageList />
        </Box>
      )}

      {/* Chat list — takes remaining height */}
      <ChatList />

      {/* New chat button */}
      <NewChatButton />

      {/* New agent button */}
      <NewAgentButton />
      <AccountSettings />
    </Box>
  );
}
