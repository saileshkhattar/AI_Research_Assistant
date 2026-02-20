import { Box } from "@mui/material";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";

export default function ChatWindow() {

  return (
    <Box display="flex" flexDirection="column" height="100%">

      <Box flex={1} overflow="auto">
        <MessageList />
      </Box>

      <MessageInput />

    </Box>
  );

}