import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  Skeleton,
} from "@mui/material";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import { AgentAPI } from "../../services/api";
import { useAgents } from "../../hooks/useAgents";
import { useChats } from "../../hooks/useChats";

export default function PageList() {
  const { activeAgentId } = useAgents();
  const { activeChatId, setActiveChat, chats } = useChats();
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(false);

  // Active page = the page_id of the current chat (if any)
  const activePage = chats.find((c) => c.id === activeChatId)?.page_id ?? null;

  useEffect(() => {
    if (!activeAgentId) return;
    setPages([]);
    setLoading(true);

    AgentAPI.getAgentUrls(activeAgentId)
      .then((result) => setPages(result))
      .catch((err) => console.error("Failed to load pages:", err))
      .finally(() => setLoading(false));
  }, [activeAgentId]);

  // Clicking a page filters the chat list to chats scoped to that page.
  // If there's an existing chat for this page, switch to it.
  // Otherwise the user can start a new chat and it will be page-scoped.
  const handlePageClick = (pageId) => {
    const existing = chats.find((c) => c.page_id === pageId);
    if (existing) {
      setActiveChat(existing.id);
    }
  };

  return (
    <Box sx={{ maxHeight: 200, overflowY: "auto", p: 1.5 }}>
      <Typography
        variant="overline"
        sx={{
          px: 1, mb: 0.5, display: "block",
          fontSize: "0.65rem", letterSpacing: "0.12em",
          color: "#4a4a60", fontFamily: "'Syne', sans-serif", fontWeight: 600,
        }}
      >
        Pages
      </Typography>

      {loading && (
        <Box sx={{ px: 1 }}>
          {[1, 2].map((i) => (
            <Skeleton key={i} variant="rounded" height={36} sx={{ mb: 0.5, bgcolor: "#1a1a20" }} />
          ))}
        </Box>
      )}

      {!loading && pages.length === 0 && (
        <Box sx={{ px: 1, py: 0.5, fontFamily: "'DM Mono', monospace", fontSize: "0.68rem", color: "#3a3a50" }}>
          No pages saved yet
        </Box>
      )}

      <List dense disablePadding>
        {pages.map((page) => {
          const isActive = activePage === page.id;
          return (
            <ListItemButton
              key={page.id}
              selected={isActive}
              onClick={() => handlePageClick(page.id)}
              sx={{
                borderRadius: "6px",
                mb: 0.25, py: 0.75, px: 1, gap: 1,
                transition: "all 0.15s",
                "&:hover": { backgroundColor: "#1a1a20", "& .page-title": { color: "#e8e8f0" } },
                "&.Mui-selected": {
                  backgroundColor: "rgba(0,212,255,0.06)",
                  borderLeft: "2px solid rgba(0,212,255,0.4)",
                  pl: "calc(8px - 2px)",
                  "& .page-title": { color: "#a0e8f8" },
                  "&:hover": { backgroundColor: "rgba(0,212,255,0.09)" },
                },
              }}
            >
              <ArticleOutlinedIcon
                sx={{ fontSize: 14, color: isActive ? "#00d4ff" : "#4a4a60", flexShrink: 0 }}
              />
              <ListItemText
                primary={page.title || page.url}
                secondary={page.url}
                primaryTypographyProps={{
                  className: "page-title",
                  noWrap: true,
                  sx: { fontFamily: "'Syne', sans-serif", fontSize: "0.8rem", fontWeight: 500, color: isActive ? "#a0e8f8" : "#7a7a90", lineHeight: 1.3, transition: "color 0.15s" },
                }}
                secondaryTypographyProps={{
                  noWrap: true,
                  sx: { fontFamily: "'DM Mono', monospace", fontSize: "0.65rem", color: "#3a3a50", lineHeight: 1.3 },
                }}
              />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );
}