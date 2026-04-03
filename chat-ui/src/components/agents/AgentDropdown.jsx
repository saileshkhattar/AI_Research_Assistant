import { FormControl, Select, MenuItem, Box, Typography } from "@mui/material";
import SmartToyOutlinedIcon from "@mui/icons-material/SmartToyOutlined";
import { useAgents } from "../../hooks/useAgents";
 
export default function AgentDropdown() {
  const { agents, activeAgentId, setActiveAgent } = useAgents();
 
  const handleChange = (event) => {
    setActiveAgent(event.target.value);
  };
 
  const activeAgent = agents.find((a) => a.id === activeAgentId);
 
  return (
    <FormControl size="small" fullWidth>
      <Select
        value={activeAgentId || ""}
        onChange={handleChange}
        displayEmpty
        renderValue={() => (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <SmartToyOutlinedIcon sx={{ fontSize: 14, color: "#00d4ff" }} />
            <Typography
              sx={{
                fontFamily: "'Syne', sans-serif",
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "#f5f7ff",
              }}
            >
              {activeAgent?.name ?? "Select agent"}
            </Typography>
          </Box>
        )}
        sx={{
          color: "#f5f7ff",
          backgroundColor: "#181a20",
          borderRadius: "8px",
          "& .MuiOutlinedInput-notchedOutline": { borderColor: "#3a3f4b" },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#3a3a50" },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#00d4ff" },
          "& .MuiSvgIcon-root": { color: "#7a8090" },
        }}
        MenuProps={{
          PaperProps: {
            sx: {
              backgroundColor: "#181a20",
              border: "1px solid #3a3f4b",
              borderRadius: "8px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
              mt: 0.5,
            },
          },
        }}
      >
        {agents?.map((agent) => (
          <MenuItem
            key={agent.id}
            value={agent.id}
            sx={{
              fontFamily: "'Syne', sans-serif",
              fontSize: "0.82rem",
              color: agent.id === activeAgentId ? "#00d4ff" : "#f5f7ff",
              backgroundColor: "transparent",
              "&:hover": { backgroundColor: "#22252e" },
              "&.Mui-selected": { backgroundColor: "rgba(0,212,255,0.08)" },
              "&.Mui-selected:hover": { backgroundColor: "rgba(0,212,255,0.12)" },
            }}
          >
            {agent.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
