import { Box, Divider } from "@mui/material";
import PageList from "../components/sidebar/PageList";
import ChatList from "../components/sidebar/ChatList";
import NewChatButton from "../components/sidebar/NewChatButton";

export default function Sidebar() {

  return (
    <Box width={300} borderRight="1px solid #ddd">

      <PageList />

      <Divider />

      <ChatList />

      <NewChatButton />

    </Box>
  );

}