import { useState } from "react";
import { UserAPI } from "../../services/api.js";

const KEY_HELP_URL = "https://aistudio.google.com/app/apikey";

export default function GeminiKeyOnboarding() {
  const [key, setKey] = useState("");
  const [showSteps, setShowSteps] = useState(false);
  const [error, setError] = useState("");

  const save = async (event) => {
    event.preventDefault();
    if (key.trim().length < 20)
      return setError("Enter a valid Gemini API key.");
    await UserAPI.saveGeminiKey(key.trim());
    setKey("");
    window.location.reload();
  };

  return (
    <main className="key-onboarding">
      <section className={`key-card ${showSteps ? "show-steps" : ""}`}>
        <div className="key-panel">
          <span className="eyebrow">PRIVATE RESEARCH</span>
          <h1>Connect Gemini</h1>
          <p>
            Your key is encrypted server-side, never shown again, and used only
            for your Gemini requests.
          </p>
          <form onSubmit={save}>
            <label htmlFor="gemini-key">Gemini API key</label>
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
            How do I get a Gemini API key?
          </button>
        </div>
        <div className="key-panel steps-panel">
          <span className="eyebrow">SETUP GUIDE</span>
          <h1>Create a key</h1>
          <ol>
            <li>Open Google AI Studio.</li>
            <li>Sign in and create or select a project.</li>
            <li>Create an API key, then restrict it to the Gemini API.</li>
            <li>Copy it here. Never share it in chat or screenshots.</li>
          </ol>
          <a href={KEY_HELP_URL} target="_blank" rel="noreferrer">
            Open Google AI Studio ↗
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
