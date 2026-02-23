import { createContext, useContext, useState, useEffect } from "react";
import { chromeStorage } from "../services/chromeStorage";
import { AgentAPI } from "../services/api.js";

const AgentContext = createContext();

export function AgentProvider({ children }) {

  const [agents, setAgents] = useState([]);
  const [activeAgentId, setActiveAgentId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    bootstrap();
  }, []);

  const bootstrap = async () => {

    try {

      const result = await chromeStorage.get([
        "user_id",
        "activeAgentId"
      ]);

      const storedUserId = result.user_id;
      const storedActiveAgentId = result.activeAgentId;

      setUserId(storedUserId);

      if (!storedUserId) {
        throw new Error("No user_id found in storage");
      }

      // Fetch agents from backend
      const backendAgents = await AgentAPI.getAgents(storedUserId);

      setAgents(backendAgents);

      // Restore active agent or set default
      const agentId =
        storedActiveAgentId ||
        backendAgents[0]?.id;

      if (agentId) {

        setActiveAgentId(agentId);

        await chromeStorage.set({
          activeAgentId: agentId
        });

      }

    } catch (err) {
      console.error("Agent bootstrap failed:", err);
    }

    setIsLoaded(true);

  };

  const setActiveAgent = async (agentId) => {

    setActiveAgentId(agentId);

    await chromeStorage.set({
      activeAgentId: agentId
    });

  };

  return (
    <AgentContext.Provider
      value={{
        agents,
        activeAgentId,
        setActiveAgent,
        userId,
        isLoaded
      }}
    >
      {children}
    </AgentContext.Provider>
  );

}

export function useAgentContext() {
  return useContext(AgentContext);
}