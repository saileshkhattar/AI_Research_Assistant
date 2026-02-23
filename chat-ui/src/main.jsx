import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
  
import { AgentProvider } from "./context/AgentsContext.jsx";
import { ChatProvider } from "./context/ChatsContext.jsx";


createRoot(document.getElementById('root')).render(
  <StrictMode>
   <AgentProvider>
    <ChatProvider>
      <App />
    </ChatProvider>
  </AgentProvider>
  </StrictMode>,
)
