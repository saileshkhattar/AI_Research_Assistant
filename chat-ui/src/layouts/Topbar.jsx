import { Box } from "@mui/material";
import AgentDropdown from "../components/agents/AgentDropdown.jsx";
import NewAgentButton from "../components/agents/NewAgentButton.jsx";

export default function Topbar() {
  return (
    <Box
      sx={{
        height: 60,
        borderBottom: "1px solid #1e1e27",
        display: "flex",
        alignItems: "center",
        px: 3,
        backgroundColor: "#0e0e11",
        gap: 2,
        flexShrink: 0,
        position: "relative",
        "&::after": {
          content: '""',
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "1px",
          background:
            "linear-gradient(to right, transparent, #00d4ff22, transparent)",
          pointerEvents: "none",
        },
      }}
    >
      <Box
        display={"flex"}
        justifyContent={"space-evenly"}
        alignItems={"center"}
      >
        <NewAgentButton />
        <AgentDropdown />
      </Box>
    </Box>
  );
}
