import { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  Divider,
  TextField,
  Typography,
} from "@mui/material";
import { AccountAPI, UserAPI } from "../../services/api.js";
import { chromeStorage } from "../../services/chromeStorage.js";

const DELETE_CONFIRM_WORD = "DELETE";

export default function AccountSettings() {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState("");
  const [status, setStatus] = useState("");

  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleted, setDeleted] = useState(false);

  const save = async () => {
    if (key.trim().length < 20) return setStatus("Enter a valid Groq API key.");
    try {
      await UserAPI.saveGroqKey(key.trim());
      setKey("");
      setStatus("Key updated securely.");
    } catch {
      setStatus("Could not update the key.");
    }
  };

  const remove = async () => {
    try {
      await UserAPI.deleteGroqKey();
      setStatus("Key removed. Add a new key before chatting.");
    } catch {
      setStatus("Could not remove the key.");
    }
  };

  const canDelete = confirmText === DELETE_CONFIRM_WORD && !deleting;

  const deleteAccount = async () => {
    if (!canDelete) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await AccountAPI.deleteAccount();

      // Clear the local session and any cached Google token so the
      // extension can't silently sign back in with stale credentials.
      await chromeStorage.removeSession("authToken");
      if (
        typeof chrome !== "undefined" &&
        chrome.identity?.clearAllCachedAuthTokens
      ) {
        try {
          await chrome.identity.clearAllCachedAuthTokens();
        } catch {
          // Non-fatal — the account is already gone server-side either way.
        }
      }

      setDeleted(true);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setDeleting(false);
      setDeleteError(
        err?.message || "Could not delete your account. Please try again.",
      );
    }
  };

  return (
    <>
      <Box sx={{ p: 1.5, borderTop: "1px solid #2a2f3a" }}>
        <Button
          fullWidth
          variant="text"
          onClick={() => {
            setOpen(true);
            setStatus("");
            setConfirmText("");
            setDeleteError("");
            setDeleted(false);
          }}
          sx={{ color: "#94a3b8", fontSize: ".75rem" }}
        >
          Account & API key
        </Button>
      </Box>

      <Dialog
        open={open}
        onClose={() => !deleting && setOpen(false)}
        PaperProps={{
          sx: { bgcolor: "#131b2f", color: "#f8fafc", minWidth: 380 },
        }}
      >
        <DialogContent>
          {deleted ? (
            <Box sx={{ py: 2, textAlign: "center" }}>
              <Typography variant="h6" sx={{ color: "#5eead4" }}>
                Account deleted
              </Typography>
              <Typography sx={{ color: "#cbd5e1", fontSize: ".8rem", mt: 1 }}>
                Everything tied to your account has been removed.
              </Typography>
            </Box>
          ) : (
            <>
              <Typography variant="h6">Groq API key</Typography>
              <Typography sx={{ color: "#cbd5e1", fontSize: ".8rem", mt: 1 }}>
                Configured securely. The key value is never displayed or
                returned to this extension.
              </Typography>
              <TextField
                fullWidth
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="Paste a replacement key"
                autoComplete="off"
                sx={{ mt: 2, input: { color: "#f8fafc" } }}
              />
              {status && (
                <Typography
                  sx={{ color: "#5eead4", fontSize: ".78rem", mt: 1 }}
                >
                  {status}
                </Typography>
              )}
              <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
                <Button variant="contained" onClick={save}>
                  Update key
                </Button>
                <Button color="error" onClick={remove}>
                  Remove key
                </Button>
              </Box>

              <Divider sx={{ my: 3, borderColor: "#2a2f3a" }} />

              <Typography variant="h6" sx={{ color: "#f87171" }}>
                Delete account
              </Typography>
              <Typography sx={{ color: "#cbd5e1", fontSize: ".8rem", mt: 1 }}>
                This permanently deletes your account, saved pages, chats, and
                stored API key. This cannot be undone.
              </Typography>
              <Typography
                sx={{ color: "#94a3b8", fontSize: ".75rem", mt: 1.5 }}
              >
                Type <strong>{DELETE_CONFIRM_WORD}</strong> to confirm.
              </Typography>
              <TextField
                fullWidth
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={DELETE_CONFIRM_WORD}
                autoComplete="off"
                error={
                  confirmText.length > 0 && confirmText !== DELETE_CONFIRM_WORD
                }
                sx={{ mt: 1, input: { color: "#f8fafc" } }}
              />
              {deleteError && (
                <Typography
                  sx={{ color: "#f87171", fontSize: ".78rem", mt: 1 }}
                >
                  {deleteError}
                </Typography>
              )}
              <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
                <Button
                  variant="contained"
                  color="error"
                  disabled={!canDelete}
                  onClick={deleteAccount}
                >
                  {deleting ? "Deleting…" : "Delete my account"}
                </Button>
                <Button onClick={() => setOpen(false)} disabled={deleting}>
                  Cancel
                </Button>
              </Box>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
