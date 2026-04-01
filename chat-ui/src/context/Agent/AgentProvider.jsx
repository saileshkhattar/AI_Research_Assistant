import { useState, useEffect } from "react";
import { chromeStorage } from "../../services/chromeStorage.js";
import { AgentAPI } from "../../services/api.js";
import { AgentContext } from "./AgentContext";

export function AgentProvider({ children }) {
  const [agents, setAgents] = useState([]);
  const [activeAgentId, setActiveAgentId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const bootstrap = async () => {
    try {
      // FIX: original code used destructuring `const { userId, activeAgentId }`
      // which shadowed the outer state setters and both were always undefined.
      const result = await chromeStorage.get(["userId", "activeAgentId"]);
      const storedUserId = result.userId;
      const storedAgentId = result.activeAgentId;

      if (!storedUserId) {
        console.error("No user_id found in chrome storage");
        setIsLoaded(true);
        return;
      }

      setUserId(storedUserId);

      const backendAgents = await AgentAPI.getAgents(storedUserId);
      setAgents(backendAgents);

      const agentId = storedAgentId || backendAgents[0]?.id;
      if (!agentId) {
        setIsLoaded(true);
        return;
      }

      setActiveAgentId(agentId);
      await chromeStorage.set({ activeAgentId: agentId });
    } catch (err) {
      console.error("Agent bootstrap failed:", err);
    }
    setIsLoaded(true);
  };

  const setActiveAgent = async (agentId) => {
    setActiveAgentId(agentId);
    await chromeStorage.set({ activeAgentId: agentId });
  };

  useEffect(() => {
    bootstrap();
  }, []);

  return (
    <AgentContext.Provider
      value={{
        agents,
        setAgents, // FIX: was missing — NewAgentButton needs this to update the list
        activeAgentId,
        setActiveAgent,
        userId,
        isLoaded,
      }}
    >
      {children}
    </AgentContext.Provider>
  );
}
