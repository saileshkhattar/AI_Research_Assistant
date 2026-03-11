import { Box, Paper, Typography } from "@mui/material";
import SmartToyOutlinedIcon from "@mui/icons-material/SmartToyOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";

export default function MessageItem({ message }) {
  const isUser = message.role === "user";

  return (
    <Box
      display="flex"
      justifyContent={isUser ? "flex-end" : "flex-start"}
      alignItems="flex-start"
      gap={1.5}
      mb={2.5}
      sx={{
        flexDirection: isUser ? "row-reverse" : "row",
      }}
    >
      {/* Avatar */}
      <Box
        sx={{
          width: 30,
          height: 30,
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          backgroundColor: isUser ? "rgba(0,212,255,0.1)" : "#141418",
          border: `1px solid ${isUser ? "rgba(0,212,255,0.2)" : "#2a2a35"}`,
          mt: 0.25,
        }}
      >
        {isUser ? (
          <PersonOutlineIcon sx={{ fontSize: 16, color: "#00d4ff" }} />
        ) : (
          <SmartToyOutlinedIcon sx={{ fontSize: 16, color: "#7a7a90" }} />
        )}
      </Box>

      {/* Bubble */}
      <Paper
        elevation={0}
        sx={{
          p: "12px 16px",
          maxWidth: "68%",
          borderRadius: isUser ? "14px 4px 14px 14px" : "4px 14px 14px 14px",
          backgroundColor: isUser ? "#0f2540" : "#13131a",
          border: `1px solid ${isUser ? "#1a4a7a" : "#1e1e27"}`,
          whiteSpace: "pre-wrap",
          position: "relative",
          transition: "border-color 0.2s",
          "&:hover": {
            borderColor: isUser ? "#1e5a8a" : "#2a2a35",
          },
        }}
      >
        <Typography
          variant="body1"
          sx={{
            fontFamily: "'Syne', sans-serif",
            fontSize: "0.9rem",
            lineHeight: 1.65,
            color: isUser ? "#c8e4f8" : "#d8d8e8",
            fontWeight: 400,
          }}
        >
          {message.content}
        </Typography>
      </Paper>
    </Box>
  );
}
