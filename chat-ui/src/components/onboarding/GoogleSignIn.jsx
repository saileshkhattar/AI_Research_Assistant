import { useState } from "react";
import { chromeStorage } from "../../services/chromeStorage.js";
import { UserAPI } from "../../services/api.js";

export default function GoogleSignIn() {
  const [error, setError] = useState("");
  const signIn = async () => {
    try {
      const result = await chrome.identity.getAuthToken({ interactive: true });
      const accessToken = typeof result === "string" ? result : result?.token;
      if (!accessToken)
        throw new Error("Google did not return an access token.");
      const session = await UserAPI.signInWithGoogle(accessToken);
      await chromeStorage.setSession({ authToken: session.access_token });
      // Providers bootstrap from the signed-in session on a clean page load.
      window.location.reload();
    } catch {
      setError("Google sign-in failed. Please try again.");
    }
  };
  return (
    <main className="key-onboarding">
      <section className="key-card">
        <div className="key-panel">
          <span className="eyebrow">PRIVATE RESEARCH</span>
          <h1>Sign in to continue</h1>
          <p>
            Sign in with Google to securely keep your research and encrypted
            Gemini API key across devices.
          </p>
          <button type="button" onClick={signIn}>
            Continue with Google
          </button>
          {error && <p className="key-error">{error}</p>}
        </div>
      </section>
    </main>
  );
}
