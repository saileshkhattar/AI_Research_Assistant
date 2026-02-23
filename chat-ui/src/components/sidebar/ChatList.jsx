import {
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemText
} from "@mui/material";

import { useChats } from "../../hooks/useChats";

export default function ChatList() {

  const {
    chats,
    activeChatId,
    setActiveChat
  } = useChats();

  const handleChatClick = (chatId) => {

    setActiveChat(chatId);

  };

  return (
    <Box
      sx={{
        flex: 1,
        overflowY: "auto",
        p: 1
      }}
    >

      <Typography variant="subtitle2" sx={{ px: 1 }}>
        Chats
      </Typography>

      <List dense>

        {chats.map((chat) => (

          <ListItemButton
            key={chat.id}
            selected={chat.id === activeChatId}
            onClick={() => handleChatClick(chat.id)}
          >

            <ListItemText
              primary={chat.title}
            />

          </ListItemButton>

        ))}

      </List>

    </Box>
  );

}