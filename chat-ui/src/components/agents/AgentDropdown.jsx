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
                color: "#e8e8f0",
              }}
            >
              {activeAgent?.name ?? "Select agent"}
            </Typography>
          </Box>
        )}
        sx={{
          color: "#e8e8f0",
          backgroundColor: "#141418",
          borderRadius: "8px",
          "& .MuiOutlinedInput-notchedOutline": { borderColor: "#2a2a35" },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#3a3a50" },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#00d4ff" },
          "& .MuiSvgIcon-root": { color: "#4a4a60" },
        }}
        MenuProps={{
          PaperProps: {
            sx: {
              backgroundColor: "#141418",
              border: "1px solid #2a2a35",
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
              color: agent.id === activeAgentId ? "#00d4ff" : "#e8e8f0",
              backgroundColor: "transparent",
              "&:hover": { backgroundColor: "#1a1a20" },
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
