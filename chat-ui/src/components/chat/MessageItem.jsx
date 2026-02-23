export default function MessageItem({ message }) {

  const isUser = message.role === "user";

  return (
    <Box
      display="flex"
      justifyContent={isUser ? "flex-end" : "flex-start"}
      mb={2}
    >

      <Paper
        elevation={0}
        sx={{
          p: 1.5,
          maxWidth: "70%",
          borderRadius: 2,
          backgroundColor: isUser ? "#1976d2" : "#f1f1f1",
          color: isUser ? "#fff" : "#000",
          whiteSpace: "pre-wrap"
        }}
      >

        <Typography variant="body1">
          {message.content}
        </Typography>
      </Paper>
    </Box>
  );

}