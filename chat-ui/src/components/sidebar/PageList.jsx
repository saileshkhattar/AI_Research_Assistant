import {
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemText
} from "@mui/material";

export default function PageList() {

  // Dummy data (replace later with backend)
  const pages = [
    {
      id: "1",
      title: "LangChain Docs",
      url: "https://docs.langchain.com"
    },
    {
      id: "2",
      title: "FastAPI Guide",
      url: "https://fastapi.tiangolo.com"
    },
    {
      id: "3",
      title: "Chroma DB Intro",
      url: "https://docs.trychroma.com"
    }
  ];

  return (
    <Box
      sx={{
        height: 200,
        overflowY: "auto",
        p: 1
      }}
    >

      <Typography
        variant="subtitle2"
        sx={{ px: 1, mb: 1 }}
      >
        Pages
      </Typography>

      <List dense>

        {pages.map((page) => (

          <ListItemButton
            key={page.id}
          >

            <ListItemText
              primary={page.title}
              secondary={page.url}
              secondaryTypographyProps={{
                noWrap: true
              }}
            />

          </ListItemButton>

        ))}

      </List>

    </Box>
  );

}