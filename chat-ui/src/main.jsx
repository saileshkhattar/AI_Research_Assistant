import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

import { AgentProvider } from "./context/Agent/AgentProvider.jsx";
import { ChatProvider } from "./context/Chat/ChatProvider.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AgentProvider>
      <ChatProvider>
        <App />
      </ChatProvider>
    </AgentProvider>
  </StrictMode>,
);
