import { Box } from "@mui/material";
import { useRef, useEffect } from "react";

import MessageItem from "./MessageItem";

import { useMessages } from "../../hooks/useMessages";

export default function MessageList() {

  const { messages } = useMessages();

  const bottomRef = useRef();

  useEffect(() => {

    bottomRef.current?.scrollIntoView({
      behavior: "smooth"
    });

  }, [messages]);

  return (
    <Box sx={{ height: "100%", overflowY: "auto", p: 2 }}>

      {messages.map((message) => (

        <MessageItem
          key={message.id}
          message={message}
        />

      ))}

      <div ref={bottomRef} />

    </Box>
  );

}