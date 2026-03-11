import { useAgentContext } from "../context/Agent/useAgentContext.js";

export function useAgents() {
  const { agents, activeAgentId, setActiveAgent, setAgents, userId } =
    useAgentContext();

  return {
    agents,
    activeAgentId,
    setActiveAgent,
    setAgents,
    userId,
  };
}
