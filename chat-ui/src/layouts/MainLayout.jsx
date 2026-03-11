import { Box } from "@mui/material";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function MainLayout({ children }) {
  return (
    <Box
      display="flex"
      height="100vh"
      width="100%"
      sx={{ backgroundColor: "#0e0e11", overflow: "hidden" }}
    >
      <Sidebar />

      <Box
        flex={1}
        display="flex"
        flexDirection="column"
        sx={{ backgroundColor: "#0e0e11", minWidth: 0 }}
      >
        <Topbar />
        <Box flex={1} sx={{ overflow: "hidden" }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
