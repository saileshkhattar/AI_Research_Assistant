import "./App.css";
import ChatPage from "./pages/ChatPages";
import { useAgentContext } from "./context/Agent/useAgentContext.js";
import { useChatContext } from "./context/Chat/useChatContext.js";
import { useEffect, useState } from "react";
import { chromeStorage } from "./services/chromeStorage.js";
import { UserAPI } from "./services/api.js";
import GroqKeyOnboarding from "./components/onboarding/GroqKeyOnboarding.jsx";
import GoogleSignIn from "./components/onboarding/GoogleSignIn.jsx";
import ReConsentScreen from "./components/onboarding/ReConsentScreen.jsx";

function App() {
  const { isLoaded: agentsLoaded } = useAgentContext();
  const { isLoaded: chatsLoaded } = useChatContext();
  const [authState, setAuthState] = useState(null);

  useEffect(() => {
    const checkSession = () => {
      chromeStorage.getSession("authToken").then(async ({ authToken }) => {
        if (!authToken) return setAuthState("signin");
        try {
          const me = await UserAPI.getMe();
          // Consent is checked before the Groq key — a user with no
          // recorded (or stale) consent shouldn't be able to reach any
          // other part of the app first.
          if (!me.consent_current) return setAuthState("consent");
          setAuthState(me.has_groq_key ? "ready" : "groqKey");
        } catch {
          await chromeStorage.removeSession("authToken");
          setAuthState("signin");
        }
      });
    };

    checkSession();

    // A long-lived session can outlive a mid-session ToS/Privacy version
    // bump. api.js turns any CONSENT_REQUIRED response into this event so
    // we drop straight into the re-consent screen instead of surfacing a
    // confusing generic error.
    const onConsentRequired = () => setAuthState("consent");
    window.addEventListener("consent-required", onConsentRequired);
    return () =>
      window.removeEventListener("consent-required", onConsentRequired);
  }, []);

  if (authState === "signin") return <GoogleSignIn />;
  if (authState === "consent") return <ReConsentScreen />;
  if (authState === "groqKey") return <GroqKeyOnboarding />;

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
