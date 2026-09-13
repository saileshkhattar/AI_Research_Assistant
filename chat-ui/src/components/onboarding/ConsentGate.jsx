import { useState } from "react";

// Placeholder — swap for the real published URLs once ToS/Privacy content exists.
const TOS_URL = "https://example.com/terms";
const PRIVACY_URL = "https://example.com/privacy";

// Same multicolor "G" mark used in Extension/popup.js's injected sign-in
// button, so both surfaces render an identical Google button.
function GoogleLogo() {
  return (
    <svg className="google-logo" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.483h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.909c1.703-1.567 2.683-3.875 2.683-6.616Z"
      />
      <path
        fill="#4285F4"
        d="M9 18c2.43 0 4.468-.806 5.957-2.179l-2.909-2.258c-.806.54-1.837.859-3.048.859-2.344 0-4.328-1.584-5.036-3.71H.957v2.332A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.712A5.41 5.41 0 0 1 3.682 9c0-.594.102-1.171.282-1.712V4.956H.957A9 9 0 0 0 0 9c0 1.453.348 2.829.957 4.044l3.007-2.332Z"
      />
      <path
        fill="#34A853"
        d="M9 3.58c1.322 0 2.508.455 3.443 1.348l2.583-2.583C13.464.891 11.426 0 9 0A9 9 0 0 0 .957 4.956l3.007 2.332C4.672 5.164 6.656 3.58 9 3.58Z"
      />
    </svg>
  );
}

export default function ConsentGate({
  buttonLabel,
  busyLabel = "Please wait…",
  onAccept,
  variant = "accent",
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

  const isGoogle = variant === "google";

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
      <button
        type="button"
        className={isGoogle ? "google-signin-btn" : undefined}
        disabled={!agreed || busy}
        onClick={handleClick}
      >
        {isGoogle && !busy && <GoogleLogo />}
        {busy ? busyLabel : buttonLabel}
      </button>
      {error && <p className="key-error">{error}</p>}
    </>
  );
}
