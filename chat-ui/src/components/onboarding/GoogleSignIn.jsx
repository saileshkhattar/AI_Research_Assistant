import { chromeStorage } from "../../services/chromeStorage.js";
import { ConsentAPI, UserAPI } from "../../services/api.js";
import ConsentGate from "./ConsentGate.jsx";

export default function GoogleSignIn() {
  const handleAccept = async () => {
    const result = await chrome.identity.getAuthToken({ interactive: true });
    const accessToken = typeof result === "string" ? result : result?.token;
    if (!accessToken) throw new Error("Google did not return an access token.");

    const session = await UserAPI.signInWithGoogle(accessToken);
    await chromeStorage.setSession({ authToken: session.access_token });

    // The checkbox in ConsentGate IS the user's consent — record it
    // server-side right away, before letting them into a usable session.
    // The server always stamps its own current ToS/Privacy version here;
    // this call carries no version number the client could spoof.
    await ConsentAPI.accept();

    // Providers bootstrap from the signed-in session on a clean page load.
    window.location.reload();
  };

  return (
    <main className="key-onboarding">
      <section className="key-card">
        <div className="key-panel">
          <span className="eyebrow">PRIVATE RESEARCH</span>
          <h1>Sign in to continue</h1>
          <p>
            Sign in with Google to securely keep your research and encrypted
            Groq API key across devices.
          </p>
          <ConsentGate
            buttonLabel="Continue with Google"
            busyLabel="Signing in…"
            onAccept={handleAccept}
          />
        </div>
      </section>
    </main>
  );
}
