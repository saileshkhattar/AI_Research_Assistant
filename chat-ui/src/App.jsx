import "./App.css";
import ChatPage from "./pages/ChatPages";
import { useAgentContext } from "./context/Agent/useAgentContext.js";
import { useChatContext } from "./context/Chat/useChatContext.js";

function App() {
  const { isLoaded: agentsLoaded } = useAgentContext();
  const { isLoaded: chatsLoaded } = useChatContext();

  if (!agentsLoaded || !chatsLoaded) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          backgroundColor: "#0e0e11",
          fontFamily: "'DM Mono', monospace",
          fontSize: "0.75rem",
          color: "#4a4a60",
          letterSpacing: "0.08em",
        }}
      >
        initialising...
      </div>
    );
  }

  return <ChatPage />;
}

export default App;
