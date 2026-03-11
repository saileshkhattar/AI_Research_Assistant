import "./App.css";
import ChatPage from "./pages/ChatPages";

import { useAgentContext } from "./context/Agent/useAgentContext.js";
import { useChatContext } from "./context/Chat/useChatContext.js";

function App() {
  const { isLoaded: agentsLoaded } = useAgentContext();
  const { isLoaded: chatsLoaded } = useChatContext();

  console.log(agentsLoaded);
  console.log(chatsLoaded);

  if (!agentsLoaded || !chatsLoaded) {
    return <div>Loading...</div>;
  }

  return <ChatPage />;
}

export default App;
