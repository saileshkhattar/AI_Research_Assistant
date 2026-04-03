import { Box, Button } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useChats } from "../../hooks/useChats";
 
export default function NewChatButton() {
  const { startNewChat, isStreaming } = useChats();
 
  return (
    <Box sx={{ p: 1.5, borderTop: "1px solid #2a2f3a" }}>
      <Button
        fullWidth
        variant="outlined"
        disabled={isStreaming}
        startIcon={<AddIcon sx={{ fontSize: "16px !important" }} />}
        onClick={startNewChat}
        sx={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 600,
          fontSize: "0.78rem",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          borderRadius: "8px",
          py: 1,
          borderColor: "#3a3f4b",
          color: "#b0b6c3",
          backgroundColor: "transparent",
          transition: "all 0.2s",
          "&:hover": {
            borderColor: "#00d4ff",
            color: "#00d4ff",
            backgroundColor: "rgba(0,212,255,0.06)",
            boxShadow: "0 0 16px rgba(0,212,255,0.1)",
          },
          "&.Mui-disabled": {
            borderColor: "#2a2f3a",
            color: "#3a3a50",
          },
        }}
      >
        New Chat
      </Button>
    </Box>
  );
}
