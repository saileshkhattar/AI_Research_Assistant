import { useState } from "react";
import { Box, TextField, IconButton, Paper } from "@mui/material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";

export default function MessageInput({ onSend, isStreaming }) {
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (!message.trim() || isStreaming) return;
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
  const canSend = hasContent && !isStreaming;

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
          border: `1px solid ${isStreaming ? "#2a2a35" : "#2a2a35"}`,
          transition: "border-color 0.2s, box-shadow 0.2s",
          "&:focus-within": {
            borderColor: isStreaming ? "#2a2a35" : "#00d4ff",
            boxShadow: isStreaming ? "none" : "0 0 0 3px rgba(0,212,255,0.06)",
          },
        }}
      >
        <TextField
          fullWidth
          multiline
          maxRows={7}
          placeholder={isStreaming ? "Waiting for response..." : "Send a message..."}
          variant="standard"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isStreaming}
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
            "& .MuiInputBase-input.Mui-disabled": {
              WebkitTextFillColor: "#4a4a60",
            },
          }}
        />
        <IconButton
          onClick={handleSend}
          disabled={!canSend}
          sx={{
            width: 36,
            height: 36,
            borderRadius: "8px",
            backgroundColor: canSend ? "#00d4ff" : "#1a1a22",
            border: `1px solid ${canSend ? "#00d4ff" : "#2a2a35"}`,
            color: canSend ? "#0e0e11" : "#3a3a50",
            transition: "all 0.2s",
            flexShrink: 0,
            "&:hover": {
              backgroundColor: canSend ? "#33ddff" : "#1f1f28",
              boxShadow: canSend ? "0 0 16px rgba(0,212,255,0.3)" : "none",
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
        {isStreaming ? "generating response..." : "Enter to send · Shift+Enter for new line"}
      </Box>
    </Box>
  );
}
