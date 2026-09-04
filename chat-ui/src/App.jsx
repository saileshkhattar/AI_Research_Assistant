import "./App.css";
import ChatPage from "./pages/ChatPages";
import { useAgentContext } from "./context/Agent/useAgentContext.js";
import { useChatContext } from "./context/Chat/useChatContext.js";
import { useEffect, useState } from "react";
import { chromeStorage } from "./services/chromeStorage.js";
import { UserAPI } from "./services/api.js";
import GeminiKeyOnboarding from "./components/onboarding/GeminiKeyOnboarding.jsx";
import GoogleSignIn from "./components/onboarding/GoogleSignIn.jsx";

function App() {
  const { isLoaded: agentsLoaded } = useAgentContext();
  const { isLoaded: chatsLoaded } = useChatContext();
  const [authState, setAuthState] = useState(null);

  useEffect(() => {
    chromeStorage.getSession("authToken").then(async ({ authToken }) => {
      if (!authToken) return setAuthState("signin");
      try {
        const me = await UserAPI.getMe();
        setAuthState(me.has_gemini_key ? "ready" : "key");
      } catch {
        await chromeStorage.removeSession("authToken");
        setAuthState("signin");
      }
    });
  }, []);

  if (authState === "signin") return <GoogleSignIn />;
  if (authState === "key") return <GeminiKeyOnboarding />;

  if (authState === null || !agentsLoaded || !chatsLoaded) {
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
