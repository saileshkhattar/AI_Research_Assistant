import { Box } from "@mui/material";
import { useRef, useEffect } from "react";

import MessageItem from "./MessageItem";
import { useMessages } from "../../hooks/useMessages";

export default function MessageList() {
  const { messages } = useMessages();
  const bottomRef = useRef();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <Box
      sx={{
        height: "100%",
        overflowY: "auto",
        p: 3,
        display: "flex",
        flexDirection: "column",
        gap: 0,
        "&::-webkit-scrollbar": { width: "4px" },
        "&::-webkit-scrollbar-track": { background: "transparent" },
        "&::-webkit-scrollbar-thumb": {
          background: "#2a2a35",
          borderRadius: "2px",
        },
      }}
    >
      {messages.length === 0 && (
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 1.5,
            opacity: 0.4,
            userSelect: "none",
          }}
        >
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: "1px solid #2a2a35",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: "#2a2a35",
              }}
            />
          </Box>
          <Box
            sx={{
              fontFamily: "'Syne', sans-serif",
              fontSize: "0.85rem",
              color: "#4a4a60",
              letterSpacing: "0.06em",
            }}
          >
            Start a conversation
          </Box>
        </Box>
      )}

      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}

      <div ref={bottomRef} />
    </Box>
  );
}
