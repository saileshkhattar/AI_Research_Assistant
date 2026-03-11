import MessageList from "./MessageList";
import MessageInput from "./MessageInput";

import { useMessages } from "../../hooks/useMessages";
import { useChats } from "../../hooks/useChats";
import { Box } from "@mui/material";

export default function ChatWindow() {
  const { activeChatId } = useChats();
  const { sendMessage } = useMessages();

  const handleSend = async (text) => {
    console.log(text);
    console.log(activeChatId);
    await sendMessage(activeChatId, text);
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      height="100%"
      sx={{ backgroundColor: "#0e0e11" }}
    >
      <Box flex={1} sx={{ overflow: "hidden" }}>
        <MessageList />
      </Box>
      <MessageInput onSend={handleSend} />
    </Box>
  );
}
