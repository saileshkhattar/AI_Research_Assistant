import { Box, Button } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

export default function NewChatButton() {
  const handleNewChat = () => {
    console.log("Create new chat");
  };

  return (
    <Box
      sx={{
        p: 1.5,
        borderTop: "1px solid #1e1e27",
      }}
    >
      <Button
        fullWidth
        variant="outlined"
        startIcon={<AddIcon sx={{ fontSize: "16px !important" }} />}
        onClick={handleNewChat}
        sx={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 600,
          fontSize: "0.78rem",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          borderRadius: "8px",
          py: 1,
          borderColor: "#2a2a35",
          color: "#7a7a90",
          backgroundColor: "transparent",
          transition: "all 0.2s",
          "&:hover": {
            borderColor: "#00d4ff",
            color: "#00d4ff",
            backgroundColor: "rgba(0,212,255,0.06)",
            boxShadow: "0 0 16px rgba(0,212,255,0.1)",
          },
        }}
      >
        New Chat
      </Button>
    </Box>
  );
}
