import { useAgentContext } from "../context/AgentsContext";

export function useAgents() {

  const {
    agents,
    activeAgentId,
    setActiveAgent,
    setAgents
  } = useAgentContext();

  return {
    agents,
    activeAgentId,
    setActiveAgent,
    setAgents
  };

}