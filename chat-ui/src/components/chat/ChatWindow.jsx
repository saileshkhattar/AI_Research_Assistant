import { Box } from "@mui/material";

import MessageList from "./MessageList";
import MessageInput from "./MessageInput";

import { useMessages } from "../../hooks/useMessages";

export default function ChatWindow() {

  const {
    messages,
    addMessage
  } = useMessages();

  const handleSend = (text) => {

    const userMessage = {
      id: Date.now(),
      role: "user",
      content: text
    };

    addMessage(userMessage);

    // Temporary fake response
    setTimeout(() => {

      const assistantMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content: "Backend response will appear here."
      };

      addMessage(assistantMessage);

    }, 500);

  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      height="100%"
    >

      <Box flex={1}>
        <MessageList messages={messages} />
      </Box>

      <MessageInput onSend={handleSend} />

    </Box>
  );

}