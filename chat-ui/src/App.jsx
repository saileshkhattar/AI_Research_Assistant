import "./App.css";
import ChatPage from "./pages/ChatPages";
import { useAgentContext } from "./context/Agent/useAgentContext.js";
import { useChatContext } from "./context/Chat/useChatContext.js";
import { useEffect, useState } from "react";
import { chromeStorage } from "./services/chromeStorage.js";
import GeminiKeyOnboarding from "./components/onboarding/GeminiKeyOnboarding.jsx";

function App() {
  const { isLoaded: agentsLoaded } = useAgentContext();
  const { isLoaded: chatsLoaded } = useChatContext();
  const [hasGeminiKey, setHasGeminiKey] = useState(null);

  useEffect(() => {
    chromeStorage.getSession("geminiApiKey").then(({ geminiApiKey }) => setHasGeminiKey(Boolean(geminiApiKey)));
  }, []);

  if (hasGeminiKey === false) return <GeminiKeyOnboarding onComplete={() => setHasGeminiKey(true)} />;

  if (hasGeminiKey === null || !agentsLoaded || !chatsLoaded) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          backgroundColor: "#0f1115",
          fontFamily: "'DM Mono', monospace",
          fontSize: "0.75rem",
          color: "#7a8090",
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
