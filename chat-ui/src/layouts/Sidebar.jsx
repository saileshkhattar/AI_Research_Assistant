import { Box, Divider } from "@mui/material";

import PageList from "../components/sidebar/PageList";
import ChatList from "../components/sidebar/ChatList";
import NewChatButton from "../components/sidebar/NewChatButton";

export default function Sidebar() {

  return (
    <Box
      sx={{
        width: 300,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid #ddd"
      }}
    >

      <PageList />

      <Divider />

      <ChatList />

      <NewChatButton />

    </Box>
  );

}