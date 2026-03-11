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
      const { userId, activeAgentId } = await chromeStorage.get([
        "userId",
        "activeAgentId",
      ]);

      if (!userId) {
        console.error("No user_id found in chrome storage");
        setIsLoaded(true);
        return;
      }

      setUserId(userId);

      // Fetch agents from backend
      const backendAgents = await AgentAPI.getAgents(userId);

      setAgents(backendAgents);

      // Determine active agent
      const agentId = activeAgentId || backendAgents[0]?.id;

      if (!agentId) {
        setIsLoaded(true);
        return;
      }

      setActiveAgentId(agentId);

      await chromeStorage.set({
        activeAgentId: agentId,
      });
    } catch (err) {
      console.error("Agent bootstrap failed:", err);
    }

    setIsLoaded(true);
  };

  /*
    Change active agent
  */
  const setActiveAgent = async (agentId) => {
    setActiveAgentId(agentId);

    await chromeStorage.set({
      activeAgentId: agentId,
    });
  };

  /*
    Load once on startup
  */
  useEffect(() => {
    const init = async () => {
      await bootstrap();
    };

    init();
  }, []);

  return (
    <AgentContext.Provider
      value={{
        agents,
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
