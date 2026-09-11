import { useState } from "react";
import { UserAPI } from "../../services/api.js";

const KEY_HELP_URL = "https://console.groq.com/keys";

export default function GeminiKeyOnboarding() {
  const [key, setKey] = useState("");
  const [showSteps, setShowSteps] = useState(false);
  const [error, setError] = useState("");

  const save = async (event) => {
    event.preventDefault();
    if (key.trim().length < 20)
      return setError("Enter a valid Groq API key.");
    await UserAPI.saveGeminiKey(key.trim());
    setKey("");
    window.location.reload();
  };

  return (
    <main className="key-onboarding">
      <section className={`key-card ${showSteps ? "show-steps" : ""}`}>
        <div className="key-panel">
          <span className="eyebrow">PRIVATE RESEARCH</span>
          <h1>Connect Groq</h1>
          <p>
            Your key is encrypted server-side, never shown again, and used only
            for your Groq requests.
          </p>
          <form onSubmit={save}>
            <label htmlFor="gemini-key">Groq API key</label>
            <input
              id="gemini-key"
              type="password"
              value={key}
              onChange={(e) => {
                setKey(e.target.value);
                setError("");
              }}
              autoComplete="off"
              spellCheck="false"
            />
            {error && <p className="key-error">{error}</p>}
            <button type="submit">Continue</button>
          </form>
          <button
            className="text-button"
            type="button"
            onClick={() => setShowSteps(true)}
          >
            How do I get a Groq API key?
          </button>
        </div>
        <div className="key-panel steps-panel">
          <span className="eyebrow">SETUP GUIDE</span>
          <h1>Create a key</h1>
          <ol>
            <li>Open the Groq API Keys page.</li>
            <li>Sign in or create a GroqCloud account.</li>
            <li>Create a new API key.</li>
            <li>Copy it here. Never share it in chat or screenshots.</li>
          </ol>
          <a href={KEY_HELP_URL} target="_blank" rel="noreferrer">
            Open Groq API Keys ↗
          </a>
          <button
            className="text-button"
            type="button"
            onClick={() => setShowSteps(false)}
          >
            ← Back
          </button>
        </div>
      </section>
    </main>
  );
}
