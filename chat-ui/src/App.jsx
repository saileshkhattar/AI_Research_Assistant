import { useState } from 'react'
import './App.css'
import ChatPage from "./pages/ChatPages";

function App() {
  const [count, setCount] = useState(0)

  return <ChatPage />
}

export default App
