import { FormControl, InputLabel, Select, MenuItem } from "@mui/material";

import { useAgents } from "../../hooks/useAgents";

export default function AgentDropdown() {
  const { agents, activeAgentId, setActiveAgent } = useAgents();

  const handleChange = (event) => {
    const agentId = event.target.value;

    setActiveAgent(agentId);
  };

  return (
    <FormControl size="small" sx={{ minWidth: 200 }}>
      <InputLabel style={{ color: "#e8e8f0" }}>Agent</InputLabel>

      <Select
        value={activeAgentId || ""}
        label="Agent"
        onChange={handleChange}
        sx={{
          color: " #e8e8f0",
          backgroundColor: "#141418",
          border: "1px solid #2a2a35",
        }}
      >
        {agents?.map((agent) => (
          <MenuItem
            key={agent.id}
            value={agent.id}
            sx={{
              backgroundColor: "#141418",
              border: "1px solid #2a2a35",
            }}
          >
            {agent.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
