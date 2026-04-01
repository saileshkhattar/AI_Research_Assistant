import { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  TextField,
  Typography,
  IconButton,
  CircularProgress,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { AgentAPI } from "../../services/api";
import { useAgents } from "../../hooks/useAgents";

export default function NewAgentButton() {
  const [open, setOpen] = useState(false);
  const [agentName, setAgentName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { userId, setAgents, setActiveAgent } = useAgents();

  const handleOpen = () => {
    setOpen(true);
    setAgentName("");
    setError("");
  };

  const handleClose = () => {
    if (loading) return;
    setOpen(false);
    setAgentName("");
    setError("");
  };

  const handleCreate = async () => {
    if (!agentName.trim()) {
      setError("Agent name cannot be empty.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const newAgent = await AgentAPI.createAgent({ user_id: userId, name: agentName });
      // Push into agent list and switch to it immediately
      setAgents((prev) => [...prev, newAgent]);
      setActiveAgent(newAgent.id);
      handleClose();
    } catch (err) {
      setError("Failed to create agent. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleCreate();
    if (e.key === "Escape") handleClose();
  };

  return (
    <>
      <Box sx={{ p: 1.5, borderTop: "1px solid #1e1e27" }}>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<AddIcon sx={{ fontSize: "16px !important" }} />}
          onClick={handleOpen}
          sx={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 600,
            fontSize: "0.78rem",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            borderRadius: "8px",
            py: 1,
            borderColor: "#2a2a35",
            color: "#7a7a90",
            backgroundColor: "transparent",
            transition: "all 0.2s",
            "&:hover": {
              borderColor: "#00d4ff",
              color: "#00d4ff",
              backgroundColor: "rgba(0,212,255,0.06)",
              boxShadow: "0 0 16px rgba(0,212,255,0.1)",
            },
          }}
        >
          New Agent
        </Button>
      </Box>

      <Dialog
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            backgroundColor: "#13131a",
            border: "1px solid #2a2a35",
            borderRadius: "14px",
            boxShadow: "0 24px 80px rgba(0,0,0,0.7), 0 0 40px rgba(0,212,255,0.05)",
            width: "100%",
            maxWidth: 420,
          },
        }}
        BackdropProps={{
          sx: { backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" },
        }}
      >
        <DialogContent sx={{ p: 0 }}>
          <Box
            sx={{
              px: 3, pt: 3, pb: 2.5,
              borderBottom: "1px solid #1e1e27",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box
                sx={{
                  width: 34, height: 34, borderRadius: "9px",
                  backgroundColor: "rgba(0,212,255,0.08)",
                  border: "1px solid rgba(0,212,255,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <AutoAwesomeIcon sx={{ fontSize: 16, color: "#00d4ff" }} />
              </Box>
              <Box>
                <Typography sx={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.95rem", color: "#e8e8f0", lineHeight: 1.2 }}>
                  New Agent
                </Typography>
                <Typography sx={{ fontFamily: "'DM Mono', monospace", fontSize: "0.68rem", color: "#4a4a60", lineHeight: 1.2, mt: 0.5 }}>
                  Configure and deploy
                </Typography>
              </Box>
            </Box>
            <IconButton
              onClick={handleClose}
              disabled={loading}
              sx={{ color: "#4a4a60", width: 30, height: 30, borderRadius: "7px", "&:hover": { color: "#e8e8f0", backgroundColor: "#1f1f28" } }}
            >
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>

          <Box sx={{ px: 3, pt: 2.5, pb: 3 }}>
            <Typography sx={{ fontFamily: "'Syne', sans-serif", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#4a4a60", mb: 1 }}>
              Agent Name
            </Typography>

            <TextField
              fullWidth autoFocus
              placeholder="e.g. Research Assistant"
              variant="outlined"
              value={agentName}
              onChange={(e) => { setAgentName(e.target.value); if (error) setError(""); }}
              onKeyDown={handleKeyDown}
              error={!!error}
              disabled={loading}
              sx={{
                "& .MuiOutlinedInput-root": {
                  backgroundColor: "#0e0e11", borderRadius: "9px",
                  fontFamily: "'Syne', sans-serif", fontSize: "0.9rem", color: "#e8e8f0",
                  "& fieldset": { borderColor: "#2a2a35" },
                  "&:hover fieldset": { borderColor: "#3a3a50" },
                  "&.Mui-focused fieldset": { borderColor: "#00d4ff", boxShadow: "0 0 0 3px rgba(0,212,255,0.07)" },
                  "&.Mui-error fieldset": { borderColor: "#ff4d6d" },
                },
                "& .MuiInputBase-input::placeholder": { color: "#3a3a50", opacity: 1 },
              }}
            />

            {error && (
              <Typography sx={{ mt: 1, fontFamily: "'DM Mono', monospace", fontSize: "0.72rem", color: "#ff4d6d" }}>
                {error}
              </Typography>
            )}

            <Box sx={{ display: "flex", gap: 1.5, mt: 3 }}>
              <Button
                fullWidth variant="outlined"
                onClick={handleClose} disabled={loading}
                sx={{
                  fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: "0.78rem",
                  letterSpacing: "0.05em", textTransform: "uppercase", borderRadius: "8px", py: 1.1,
                  borderColor: "#2a2a35", color: "#7a7a90", backgroundColor: "transparent",
                  "&:hover": { borderColor: "#3a3a50", color: "#e8e8f0", backgroundColor: "#1a1a20" },
                  "&.Mui-disabled": { borderColor: "#1e1e27", color: "#3a3a50" },
                }}
              >
                Cancel
              </Button>
              <Button
                fullWidth variant="contained"
                onClick={handleCreate}
                disabled={loading || !agentName.trim()}
                startIcon={loading ? <CircularProgress size={14} sx={{ color: "#0e0e11" }} /> : <AddIcon sx={{ fontSize: "16px !important" }} />}
                sx={{
                  fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.78rem",
                  letterSpacing: "0.05em", textTransform: "uppercase", borderRadius: "8px", py: 1.1,
                  backgroundColor: "#00d4ff", color: "#0e0e11", boxShadow: "none",
                  "&:hover": { backgroundColor: "#33ddff", boxShadow: "0 0 20px rgba(0,212,255,0.3)" },
                  "&.Mui-disabled": { backgroundColor: "#1a1a22", color: "#3a3a50", boxShadow: "none" },
                }}
              >
                {loading ? "Creating..." : "Create Agent"}
              </Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
}
