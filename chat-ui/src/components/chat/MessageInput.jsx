import { useState } from "react";
import { Box, TextField, IconButton, Paper } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";

export default function MessageInput({ onSend }) {

  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (!message.trim()) return;

    if (onSend) {
      onSend(message);
    }

    setMessage("");
  };

  const handleKeyDown = (e) => {

    // Enter = send
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }

  };

  return (
    <Box
      sx={{
        p: 2,
        borderTop: "1px solid #ddd",
        backgroundColor: "#fff"
      }}
    >

      <Paper
        elevation={0}
        sx={{
          display: "flex",
          alignItems: "flex-end",
          padding: "8px",
          borderRadius: "12px",
          border: "1px solid #ddd"
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
          InputProps={{
            disableUnderline: true
          }}
          sx={{
            mr: 1
          }}
        />
        <IconButton
          onClick={handleSend}
          color="primary"
        >
          <SendIcon />
        </IconButton>
      </Paper>
    </Box>
  );
}