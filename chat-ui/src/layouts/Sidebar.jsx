import { Box, Divider } from "@mui/material";

import PageList from "../components/sidebar/PageList";
import ChatList from "../components/sidebar/ChatList";
import NewChatButton from "../components/sidebar/NewChatButton";

export default function Sidebar() {
  return (
    <Box
      sx={{
        width: 280,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#0e0e11",
        borderRight: "1px solid #1e1e27",
        flexShrink: 0,
        position: "relative",
        "&::after": {
          content: '""',
          position: "absolute",
          top: 0,
          right: 0,
          width: "1px",
          height: "100%",
          background:
            "linear-gradient(to bottom, transparent, #00d4ff22, transparent)",
          pointerEvents: "none",
        },
      }}
    >
      <Box
        sx={{
          px: 2.5,
          py: 2,
          display: "flex",
          alignItems: "center",
          gap: 1,
          borderBottom: "1px solid #1e1e27",
        }}
      >
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: "#00d4ff",
            boxShadow: "0 0 8px #00d4ff",
          }}
        />
        <Box
          component="span"
          sx={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            fontSize: "0.95rem",
            color: "#e8e8f0",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Workspace
        </Box>
      </Box>

      <PageList />

      <Divider sx={{ borderColor: "#1e1e27", mx: 1.5 }} />

      <ChatList />

      <NewChatButton />
    </Box>
  );
}
