import { useState } from "react";
import { Box, Button, Dialog, DialogContent, TextField, Typography } from "@mui/material";
import { UserAPI } from "../../services/api.js";

export default function AccountSettings() {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState("");
  const [status, setStatus] = useState("");
  const save = async () => {
    if (key.trim().length < 20) return setStatus("Enter a valid Gemini API key.");
    try { await UserAPI.saveGeminiKey(key.trim()); setKey(""); setStatus("Key updated securely."); }
    catch { setStatus("Could not update the key."); }
  };
  const remove = async () => {
    try { await UserAPI.deleteGeminiKey(); setStatus("Key removed. Add a new key before chatting."); }
    catch { setStatus("Could not remove the key."); }
  };
  return <><Box sx={{ p: 1.5, borderTop: "1px solid #2a2f3a" }}>
    <Button fullWidth variant="text" onClick={() => { setOpen(true); setStatus(""); }} sx={{ color: "#94a3b8", fontSize: ".75rem" }}>Account & API key</Button>
  </Box><Dialog open={open} onClose={() => setOpen(false)} PaperProps={{ sx: { bgcolor: "#131b2f", color: "#f8fafc", minWidth: 360 } }}>
    <DialogContent><Typography variant="h6">Gemini API key</Typography><Typography sx={{ color: "#cbd5e1", fontSize: ".8rem", mt: 1 }}>Configured securely. The key value is never displayed or returned to this extension.</Typography>
    <TextField fullWidth type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="Paste a replacement key" autoComplete="off" sx={{ mt: 2, input: { color: "#f8fafc" } }} />
    {status && <Typography sx={{ color: "#5eead4", fontSize: ".78rem", mt: 1 }}>{status}</Typography>}
    <Box sx={{ display: "flex", gap: 1, mt: 2 }}><Button variant="contained" onClick={save}>Update key</Button><Button color="error" onClick={remove}>Remove key</Button></Box>
    </DialogContent></Dialog></>;
}
