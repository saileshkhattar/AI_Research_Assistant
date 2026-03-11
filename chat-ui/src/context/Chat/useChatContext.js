import { useContext } from "react";
import { ChatContext } from "./ChatContext.js";

export function useChatContext() {
  return useContext(ChatContext);
}
