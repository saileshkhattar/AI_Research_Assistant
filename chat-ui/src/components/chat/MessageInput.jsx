import { useState } from "react";
import { Box, TextField, IconButton, Paper } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import { MessageAPI } from "../../services/api";

export default function MessageInput({ onSend }) {
  const [message, setMessage] = useState("");

  const handleSend = () => {
    console.log("Trying to send", message);
    if (!message.trim()) return;
    if (onSend) onSend(message);
    setMessage("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasContent = message.trim().length > 0;

  return (
    <Box
      sx={{
        p: 2.5,
        borderTop: "1px solid #1e1e27",
        backgroundColor: "#0e0e11",
        flexShrink: 0,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          display: "flex",
          alignItems: "flex-end",
          padding: "10px 10px 10px 16px",
          borderRadius: "12px",
          backgroundColor: "#141418",
          border: "1px solid #2a2a35",
          transition: "border-color 0.2s, box-shadow 0.2s",
          "&:focus-within": {
            borderColor: "#00d4ff",
            boxShadow: "0 0 0 3px rgba(0,212,255,0.06)",
          },
        }}
      >
        <TextField
          fullWidth
          multiline
          maxRows={7}
          placeholder="Send a message..."
          variant="standard"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          InputProps={{ disableUnderline: true }}
          sx={{
            mr: 1,
            "& .MuiInputBase-root": {
              fontFamily: "'Syne', sans-serif",
              fontSize: "0.9rem",
              color: "#e8e8f0",
              lineHeight: 1.6,
            },
            "& .MuiInputBase-input::placeholder": {
              color: "#4a4a60",
              opacity: 1,
              fontFamily: "'Syne', sans-serif",
            },
          }}
        />
        <IconButton
          onClick={handleSend}
          disabled={!hasContent}
          sx={{
            width: 36,
            height: 36,
            borderRadius: "8px",
            backgroundColor: hasContent ? "#00d4ff" : "#1a1a22",
            border: `1px solid ${hasContent ? "#00d4ff" : "#2a2a35"}`,
            color: hasContent ? "#0e0e11" : "#3a3a50",
            transition: "all 0.2s",
            flexShrink: 0,
            "&:hover": {
              backgroundColor: hasContent ? "#33ddff" : "#1f1f28",
              boxShadow: hasContent ? "0 0 16px rgba(0,212,255,0.3)" : "none",
            },
            "&.Mui-disabled": {
              backgroundColor: "#141418",
              border: "1px solid #1e1e27",
              color: "#3a3a50",
            },
          }}
        >
          <ArrowUpwardIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Paper>

      <Box
        sx={{
          mt: 1,
          textAlign: "center",
          fontFamily: "'DM Mono', monospace",
          fontSize: "0.62rem",
          color: "#3a3a50",
          letterSpacing: "0.03em",
        }}
      >
        Enter to send · Shift+Enter for new line
      </Box>
    </Box>
  );
}
