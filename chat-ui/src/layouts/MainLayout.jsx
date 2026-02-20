import { Box } from "@mui/material";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function MainLayout({ children }) {

  return (
    <Box display="flex" height="100vh">

      <Sidebar />

      <Box flex={1} display="flex" flexDirection="column">

        <Topbar />

        <Box flex={1}>
          {children}
        </Box>

      </Box>

    </Box>
  );

}