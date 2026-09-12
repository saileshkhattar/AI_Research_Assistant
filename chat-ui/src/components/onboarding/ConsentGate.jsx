import { useState } from "react";

// Placeholder — swap for the real published URLs once ToS/Privacy content exists.
const TOS_URL = "https://example.com/terms";
const PRIVACY_URL = "https://example.com/privacy";

export default function ConsentGate({
  buttonLabel,
  busyLabel = "Please wait…",
  onAccept,
}) {
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleClick = async () => {
    if (!agreed || busy) return;
    setBusy(true);
    setError("");
    try {
      await onAccept();
    } catch (err) {
      setError(err?.message || "Something went wrong. Please try again.");
      setBusy(false);
    }
    // No `finally` reset of `busy` on success — the caller reloads the page
    // right after, so staying disabled avoids a flash of re-enabled state.
  };

  return (
    <>
      <label className="consent-row">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
        />
        <span>
          I agree to the{" "}
          <a href={TOS_URL} target="_blank" rel="noreferrer">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href={PRIVACY_URL} target="_blank" rel="noreferrer">
            Privacy Policy
          </a>
        </span>
      </label>
      <button type="button" disabled={!agreed || busy} onClick={handleClick}>
        {busy ? busyLabel : buttonLabel}
      </button>
      {error && <p className="key-error">{error}</p>}
    </>
  );
}
