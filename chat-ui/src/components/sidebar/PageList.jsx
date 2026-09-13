import { useEffect } from "react";
import {
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  Skeleton,
  IconButton,
  Tooltip,
} from "@mui/material";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { PageAPI } from "../../services/api";
import { useAgents } from "../../hooks/useAgents";
import { useChats } from "../../hooks/useChats";

export default function PageList() {
  const { activeAgentId, agents, userId } = useAgents();
  const {
    activeChatId,
    setActiveChat,
    chats,
    startNewChat,
    pages,
    setPages,
    pagesLoaded,
    refreshPages,
    pageFilter,
    setPageFilter,
  } = useChats();

  const activeAgent = agents.find((a) => a.id === activeAgentId);
  const isInbox = activeAgent?.type === "system_inbox";

  // Which page is "selected" — for Inbox this is the filter; for other
  // agent types it's whichever page the currently-open chat is scoped to.
  const activePage = isInbox
    ? pageFilter
    : (chats.find((c) => c.id === activeChatId)?.page_id ?? null);

  useEffect(() => {
    refreshPages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAgentId]);

  const handlePageClick = (page) => {
    if (isInbox) {
      // Inbox: a page is a FILTER on the chat list, not a single fixed
      // chat — a page can have several chats. Selecting a different page
      // clears whichever chat was open so the list below re-filters and
      // the chat window returns to its "pick or start a chat" state.
      if (pageFilter !== page.id) {
        setPageFilter(page.id);
        startNewChat();
      }
    } else {
      // knowledge/custom: switch to the existing chat for this page, if any
      const existing = chats.find((c) => c.page_id === page.id);
      if (existing) setActiveChat(existing.id);
    }
  };

  const handleDelete = async (e, pageId) => {
    e.stopPropagation();
    if (!userId) return;
    try {
      await PageAPI.deletePage(pageId);
      setPages((prev) => prev.filter((p) => p.id !== pageId));
      if (isInbox && pageFilter === pageId) setPageFilter(null);
      const chatForPage = chats.find((c) => c.page_id === pageId);
      if (chatForPage && chatForPage.id === activeChatId) startNewChat();
    } catch (err) {
      console.error("Failed to delete page:", err);
    }
  };

  const loading = !pagesLoaded;

  return (
    <Box sx={{ maxHeight: 220, overflowY: "auto", p: 1.5 }}>
      <Typography
        variant="overline"
        sx={{
          px: 1,
          mb: 0.5,
          display: "block",
          fontSize: "0.65rem",
          letterSpacing: "0.12em",
          color: "#4a4a60",
          fontFamily: "'Syne', sans-serif",
          fontWeight: 600,
        }}
      >
        Pages{" "}
        {isInbox && (
          <span style={{ color: "#a78bfa", marginLeft: 4 }}>· inbox</span>
        )}
      </Typography>

      {loading && (
        <Box sx={{ px: 1 }}>
          {[1, 2].map((i) => (
            <Skeleton
              key={i}
              variant="rounded"
              height={38}
              sx={{ mb: 0.5, bgcolor: "#1a1a20" }}
            />
          ))}
        </Box>
      )}

      {!loading && pages.length === 0 && (
        <Box
          sx={{
            px: 1,
            py: 0.75,
            fontFamily: "'DM Mono', monospace",
            fontSize: "0.68rem",
            color: "#3a3a50",
            lineHeight: 1.5,
          }}
        >
          No pages saved yet.{"\n"}
          {isInbox
            ? "Save a page from the extension to chat about it."
            : "Browse a page and save it from the extension."}
        </Box>
      )}

      <List dense disablePadding>
        {pages.map((page) => {
          const isActive = activePage === page.id;
          const label = page.title?.trim()
            ? page.title
            : page.display_url || page.url;
          const sublabel = page.display_url || page.url;

          return (
            <Tooltip
              key={page.id}
              title={page.url}
              placement="right"
              arrow
              enterDelay={700}
              componentsProps={{
                tooltip: {
                  sx: {
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "0.68rem",
                    backgroundColor: "#1a1a20",
                    border: "1px solid #2a2a35",
                    color: "#7a7a90",
                    maxWidth: 320,
                    wordBreak: "break-all",
                  },
                },
              }}
            >
              <ListItemButton
                selected={isActive}
                onClick={() => handlePageClick(page)}
                sx={{
                  borderRadius: "6px",
                  mb: 0.25,
                  py: 0.6,
                  px: 1,
                  gap: 1,
                  transition: "all 0.15s",
                  "& .delete-btn": { opacity: 0 },
                  "&:hover": {
                    backgroundColor: "#1a1a20",
                    "& .page-label": { color: "#e8e8f0" },
                    "& .delete-btn": { opacity: 1 },
                  },
                  "&.Mui-selected": {
                    backgroundColor: isInbox
                      ? "rgba(167,139,250,0.07)"
                      : "rgba(0,212,255,0.07)",
                    borderLeft: `2px solid ${isInbox ? "rgba(167,139,250,0.4)" : "rgba(0,212,255,0.4)"}`,
                    pl: "calc(8px - 2px)",
                    "& .page-label": { color: isInbox ? "#c4b5fd" : "#a0e8f8" },
                    "&:hover": {
                      backgroundColor: isInbox
                        ? "rgba(167,139,250,0.1)"
                        : "rgba(0,212,255,0.1)",
                    },
                  },
                }}
              >
                <ArticleOutlinedIcon
                  sx={{
                    fontSize: 13,
                    color: isActive
                      ? isInbox
                        ? "#a78bfa"
                        : "#00d4ff"
                      : "#4a4a60",
                    flexShrink: 0,
                    mt: "1px",
                  }}
                />
                <ListItemText
                  primary={label}
                  secondary={sublabel}
                  primaryTypographyProps={{
                    className: "page-label",
                    noWrap: true,
                    sx: {
                      fontFamily: "'Syne', sans-serif",
                      fontSize: "0.8rem",
                      fontWeight: 500,
                      color: isActive
                        ? isInbox
                          ? "#c4b5fd"
                          : "#a0e8f8"
                        : "#7a7a90",
                      lineHeight: 1.3,
                      transition: "color 0.15s",
                    },
                  }}
                  secondaryTypographyProps={{
                    noWrap: true,
                    sx: {
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "0.62rem",
                      color: "#3a3a50",
                      lineHeight: 1.2,
                      mt: "1px",
                    },
                  }}
                />
                <IconButton
                  className="delete-btn"
                  size="small"
                  onClick={(e) => handleDelete(e, page.id)}
                  sx={{
                    width: 22,
                    height: 22,
                    borderRadius: "5px",
                    flexShrink: 0,
                    color: "#4a4a60",
                    transition: "all 0.15s",
                    "&:hover": {
                      color: "#ff4d6d",
                      backgroundColor: "rgba(255,77,109,0.1)",
                    },
                  }}
                >
                  <DeleteOutlineIcon sx={{ fontSize: 13 }} />
                </IconButton>
              </ListItemButton>
            </Tooltip>
          );
        })}
      </List>
    </Box>
  );
}
