import { Box, Skeleton } from "@mui/material";
import { useRef, useEffect, useState } from "react";
import MessageItem from "./MessageItem";
import { useMessages } from "../../hooks/useMessages";
import { useChats } from "../../hooks/useChats";

export default function MessageList() {
  const { messages, isStreaming } = useMessages();
  const { activeChatId } = useChats();
  const bottomRef = useRef();
  const [loadingMessages, setLoadingMessages] = useState(false);
  const prevChatId = useRef(null);

  // Show skeleton while switching chats and messages are loading
  useEffect(() => {
    if (activeChatId !== prevChatId.current) {
      if (activeChatId) setLoadingMessages(true);
      prevChatId.current = activeChatId;
    }
  }, [activeChatId]);

  // Once messages arrive (or stay empty), stop showing skeleton
  useEffect(() => {
    setLoadingMessages(false);
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (loadingMessages) {
    return (
      <Box sx={{ height: "100%", overflowY: "auto", p: 3 }}>
        {[1, 2, 3].map((i) => (
          <Box key={i} sx={{ display: "flex", gap: 1.5, mb: 2.5, flexDirection: i % 2 === 0 ? "row-reverse" : "row" }}>
            <Skeleton variant="rounded" width={30} height={30} sx={{ bgcolor: "#1a1a20", flexShrink: 0, borderRadius: "8px" }} />
            <Skeleton variant="rounded" width={i % 2 === 0 ? "55%" : "70%"} height={56} sx={{ bgcolor: "#1a1a20", borderRadius: "12px" }} />
          </Box>
        ))}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: "100%",
        overflowY: "auto",
        p: 3,
        display: "flex",
        flexDirection: "column",
        "&::-webkit-scrollbar": { width: "4px" },
        "&::-webkit-scrollbar-track": { background: "transparent" },
        "&::-webkit-scrollbar-thumb": { background: "#2a2a35", borderRadius: "2px" },
      }}
    >
      {messages.length === 0 && !isStreaming && (
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
              width: 40, height: 40, borderRadius: "50%",
              border: "1px solid #2a2a35",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#2a2a35" }} />
          </Box>
          <Box sx={{ fontFamily: "'Syne', sans-serif", fontSize: "0.85rem", color: "#4a4a60", letterSpacing: "0.06em" }}>
            {activeChatId ? "No messages yet" : "Start a conversation"}
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
