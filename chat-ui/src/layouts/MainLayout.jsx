import { Box } from "@mui/material";
import Sidebar from "../components/sidebar/Sidebar";

export default function MainLayout({ children }) {
  return (
    <Box
      display="flex"
      height="100vh"
      sx={{ backgroundColor: "#0e0e11", overflow: "hidden" }}
    >
      <Sidebar />
      <Box flex={1} sx={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {children}
      </Box>
    </Box>
  );
}
