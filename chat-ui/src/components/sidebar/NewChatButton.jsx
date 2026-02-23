import { Box, Button } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

export default function NewChatButton() {

  const handleNewChat = () => {

    console.log("Create new chat");

  };

  return (
    <Box
      sx={{
        p: 1,
        borderTop: "1px solid #ddd"
      }}
    >

      <Button
        fullWidth
        variant="contained"
        startIcon={<AddIcon />}
        onClick={handleNewChat}
      >
        New Chat
      </Button>

    </Box>
  );
}