import { useContext } from "react";
import { AgentContext } from "./AgentContext";

export function useAgentContext() {
  return useContext(AgentContext);
}
