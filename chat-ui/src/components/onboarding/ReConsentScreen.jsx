import { ConsentAPI } from "../../services/api.js";
import ConsentGate from "./ConsentGate.jsx";

export default function ReConsentScreen() {
  const handleAccept = async () => {
    await ConsentAPI.accept();
    window.location.reload();
  };

  return (
    <main className="key-onboarding">
      <section className="key-card">
        <div className="key-panel">
          <span className="eyebrow">PRIVATE RESEARCH</span>
          <h1>Our terms have been updated</h1>
          <p>
            Please review and accept our updated Terms of Service and Privacy
            Policy to keep using TabChat.
          </p>
          <ConsentGate
            buttonLabel="I Agree & Continue"
            busyLabel="Saving…"
            onAccept={handleAccept}
          />
        </div>
      </section>
    </main>
  );
}
