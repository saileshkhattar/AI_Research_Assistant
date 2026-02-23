import { useState } from 'react'
import './App.css'
import ChatPage from "./pages/ChatPages";

import { useAgentContext } from "./context/AgentsContext";
import { useChatContext } from "./context/ChatsContext";

function App() {
  const { isLoaded: agentsLoaded } = useAgentContext();
  const { isLoaded: chatsLoaded } = useChatContext();

  if (!agentsLoaded || !chatsLoaded) {
    return <div>Loading...</div>;
  }

  return <ChatPage />
}

export default App
