import { Box, Paper, Typography } from "@mui/material";
import SmartToyOutlinedIcon from "@mui/icons-material/SmartToyOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";

export default function MessageItem({ message }) {
  const isUser     = message.role === "user";
  const isStreaming = message.streaming === true;

  return (
    // The outer Box controls which side the whole message sits on.
    // We do NOT use flexDirection: row-reverse because that fights
    // justifyContent and produces the bug seen in the screenshot
    // (user bubble appearing on the left).
    // Instead: both rows are flex-direction: row, but user rows use
    // alignSelf: flex-end on the inner content and push the avatar
    // after the bubble manually with CSS order.
    <Box
      display="flex"
      flexDirection="row"
      alignItems="flex-start"
      gap={1.5}
      mb={2.5}
      sx={{
        // User rows flush right; assistant rows flush left
        justifyContent: isUser ? "flex-end" : "flex-start",
      }}
    >
      {/* ── Avatar ── rendered first in DOM but visually after bubble for user */}
      {!isUser && (
        <Box
          sx={{
            width: 30,
            height: 30,
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            backgroundColor: "#141418",
            border: "1px solid #2a2a35",
            mt: "2px",
          }}
        >
          <SmartToyOutlinedIcon
            sx={{
              fontSize: 16,
              color: isStreaming ? "#00d4ff" : "#7a7a90",
              transition: "color 0.3s",
            }}
          />
        </Box>
      )}

      {/* ── Bubble ── */}
      <Paper
        elevation={0}
        sx={{
          p: "10px 14px",
          maxWidth: "68%",
          minWidth: isStreaming && !message.content ? 48 : undefined,
          borderRadius: isUser ? "14px 4px 14px 14px" : "4px 14px 14px 14px",
          backgroundColor: isUser ? "#173a5e" : "#172033",
          border: `1px solid ${
            isUser
              ? "#3b82f6"
              : isStreaming
              ? "rgba(0,212,255,0.18)"
              : "#405275"
          }`,
          whiteSpace: "pre-wrap",
          transition: "border-color 0.3s",
          "&:hover": {
            borderColor: isUser ? "#60a5fa" : "#5a6f96",
          },
        }}
      >
        <Typography
          variant="body1"
          sx={{
            fontFamily: "'Syne', sans-serif",
            fontSize: "0.9rem",
            lineHeight: 1.65,
            color: isUser ? "#eff6ff" : "#f1f5f9",
            fontWeight: 400,
          }}
        >
          {message.content}

          {/* Blinking cursor during streaming */}
          {isStreaming && (
            <Box
              component="span"
              sx={{
                display: "inline-block",
                width: "2px",
                height: "1em",
                backgroundColor: "#00d4ff",
                ml: "2px",
                verticalAlign: "text-bottom",
                borderRadius: "1px",
                "@keyframes blink": {
                  "0%, 100%": { opacity: 1 },
                  "50%": { opacity: 0 },
                },
                animation: "blink 0.8s step-end infinite",
              }}
            />
          )}
        </Typography>
      </Paper>

      {/* ── User avatar — rendered AFTER bubble so it sits on the right ── */}
      {isUser && (
        <Box
          sx={{
            width: 30,
            height: 30,
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            backgroundColor: "rgba(0,212,255,0.08)",
            border: "1px solid rgba(0,212,255,0.2)",
            mt: "2px",
          }}
        >
          <PersonOutlineIcon sx={{ fontSize: 16, color: "#00d4ff" }} />
        </Box>
      )}
    </Box>
  );
}
