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
          <MarkdownText content={message.content} />

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

// Keep model output as React text nodes instead of injecting model-provided
// HTML. This covers the Markdown people expect in answers while preventing a
// response from becoming executable extension-page markup.
function MarkdownText({ content = "" }) {
  const lines = content.replace(/\r/g, "").split("\n");
  const blocks = [];
  let list = [];
  let codeLines = [];
  let inCode = false;

  const flushList = () => {
    if (!list.length) return;
    blocks.push(
      <Box component="ul" key={`list-${blocks.length}`} sx={{ my: 0.5, pl: 2.5 }}>
        {list.map((item, index) => <li key={index}>{inlineMarkdown(item)}</li>)}
      </Box>,
    );
    list = [];
  };
  const flushCode = () => {
    if (!codeLines.length) return;
    blocks.push(
      <Box component="pre" key={`code-${blocks.length}`} sx={{ m: "8px 0", p: 1, overflowX: "auto", borderRadius: 1, backgroundColor: "#0b1020", fontFamily: "'DM Mono', monospace", fontSize: "0.8em" }}>
        {codeLines.join("\n")}
      </Box>,
    );
    codeLines = [];
  };

  lines.forEach((line, index) => {
    if (line.startsWith("```")) {
      if (inCode) flushCode();
      else flushList();
      inCode = !inCode;
      return;
    }
    if (inCode) {
      codeLines.push(line);
      return;
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    const bullet = line.match(/^\s*[-*+]\s+(.+)$/);
    if (bullet) {
      list.push(bullet[1]);
      return;
    }
    flushList();
    if (heading) {
      blocks.push(<Box component="strong" key={`heading-${index}`} sx={{ display: "block", mt: 1, mb: 0.25, fontSize: heading[1].length === 1 ? "1.1em" : "1em" }}>{inlineMarkdown(heading[2])}</Box>);
    } else if (line) {
      blocks.push(<Box component="span" key={`line-${index}`} sx={{ display: "block", minHeight: "1.65em" }}>{inlineMarkdown(line)}</Box>);
    } else {
      blocks.push(<Box component="br" key={`break-${index}`} />);
    }
  });
  if (inCode) flushCode();
  flushList();
  return <>{blocks}</>;
}

function inlineMarkdown(text) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^\s)]+\))/g);
  return parts.map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return <Box component="code" key={index} sx={{ px: 0.4, py: 0.1, borderRadius: 0.5, backgroundColor: "#0b1020", fontFamily: "'DM Mono', monospace", fontSize: "0.85em" }}>{part.slice(1, -1)}</Box>;
    }
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    const link = part.match(/^\[([^\]]+)\]\(([^\s)]+)\)$/);
    if (link) {
      // Permit only ordinary web links from untrusted model text.
      try {
        const url = new URL(link[2]);
        if (url.protocol === "https:" || url.protocol === "http:") return <a key={index} href={url.href} target="_blank" rel="noopener noreferrer">{link[1]}</a>;
      } catch { /* render an invalid link as text */ }
    }
    return part;
  });
}
