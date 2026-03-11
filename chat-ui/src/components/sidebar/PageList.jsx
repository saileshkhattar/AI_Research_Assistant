import {
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemText,
} from "@mui/material";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";

export default function PageList() {
  const pages = [
    { id: "1", title: "LangChain Docs", url: "https://docs.langchain.com" },
    { id: "2", title: "FastAPI Guide", url: "https://fastapi.tiangolo.com" },
    { id: "3", title: "Chroma DB Intro", url: "https://docs.trychroma.com" },
  ];

  return (
    <Box sx={{ height: 200, overflowY: "auto", p: 1.5 }}>
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
        Pages
      </Typography>

      <List dense disablePadding>
        {pages.map((page) => (
          <ListItemButton
            key={page.id}
            sx={{
              borderRadius: "6px",
              mb: 0.25,
              py: 0.75,
              px: 1,
              gap: 1,
              transition: "all 0.15s",
              "&:hover": {
                backgroundColor: "#1a1a20",
                "& .page-title": { color: "#e8e8f0" },
              },
            }}
          >
            <ArticleOutlinedIcon
              sx={{ fontSize: 14, color: "#4a4a60", flexShrink: 0 }}
            />
            <ListItemText
              primary={page.title}
              secondary={page.url}
              primaryTypographyProps={{
                className: "page-title",
                sx: {
                  fontFamily: "'Syne', sans-serif",
                  fontSize: "0.8rem",
                  fontWeight: 500,
                  color: "#7a7a90",
                  lineHeight: 1.3,
                  transition: "color 0.15s",
                },
              }}
              secondaryTypographyProps={{
                noWrap: true,
                sx: {
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "0.65rem",
                  color: "#3a3a50",
                  lineHeight: 1.3,
                },
              }}
            />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
}
