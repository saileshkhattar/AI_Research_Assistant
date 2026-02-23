import {
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from "@mui/material";

import { useAgents } from "../../hooks/useAgents";

export default function AgentDropdown() {

  const {
    agents,
    activeAgentId,
    setActiveAgent
  } = useAgents();

  const handleChange = (event) => {

    const agentId = event.target.value;

    setActiveAgent(agentId);

  };

  return (
    <FormControl size="small" sx={{ minWidth: 200 }}>

      <InputLabel>
        Agent
      </InputLabel>

      <Select
        value={activeAgentId || ""}
        label="Agent"
        onChange={handleChange}
      >

        {agents?.map((agent) => (

          <MenuItem
            key={agent.id}
            value={agent.id}
          >
            {agent.name}
          </MenuItem>

        ))}

      </Select>

    </FormControl>
  );

}