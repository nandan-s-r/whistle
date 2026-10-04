"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/apiClient";

export default function SettingsPage() {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    apiFetch("/api/auth/me")
      .then((data) => {
        setName(data.name || "");
        setRole(data.role || "");
        setEmail(data.email || "");
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiFetch("/api/auth/me", {
        method: "PUT",
        body: JSON.stringify({ name, role }),
      });
      setToast("Profile saved successfully.");
      setTimeout(() => setToast(""), 3000);
      
      // Update local storage user info if present
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.name = name;
        localStorage.setItem("user", JSON.stringify(parsed));
      }
      
    } catch (err) {
      console.error(err);
      setToast("Failed to save profile.");
      setTimeout(() => setToast(""), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ marginBottom: "24px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "12px" }}>
        <h1 style={{ fontSize: "24px", margin: 0 }}>System Settings</h1>
        <div className="mono" style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>USER PREFERENCES & PROFILE</div>
      </div>

      {loading ? (
        <div className="panel text-muted" style={{ textAlign: "center", padding: "40px" }}>
          LOADING PROFILE...
        </div>
      ) : (
        <div className="panel" style={{ maxWidth: "600px" }}>
          <div className="panel-header">User Profile</div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "12px" }}>
            <div>
              <label className="mono text-muted" style={{ fontSize: "10px", display: "block", marginBottom: "4px" }}>EMAIL ADDRESS (READ-ONLY)</label>
              <input
                type="text"
                value={email}
                disabled
                style={{ width: "100%", background: "rgba(255,255,255,0.03)", color: "var(--text-muted)", border: "1px solid var(--border-subtle)", padding: "8px", fontSize: "12px", outline: "none", cursor: "not-allowed" }}
              />
            </div>
            
            <div>
              <label className="mono text-muted" style={{ fontSize: "10px", display: "block", marginBottom: "4px" }}>FULL NAME</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ width: "100%", background: "var(--bg-main)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)", padding: "8px", fontSize: "12px", outline: "none" }}
              />
            </div>

            <div>
              <label className="mono text-muted" style={{ fontSize: "10px", display: "block", marginBottom: "4px" }}>ROLE / TITLE</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{ width: "100%", background: "var(--bg-main)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)", padding: "8px", fontSize: "12px", outline: "none" }}
              />
            </div>

            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving}
              style={{ marginTop: "8px" }}
            >
              {saving ? "SAVING..." : "SAVE PROFILE"}
            </button>
            
            {toast && (
              <div className="mono text-muted" style={{ fontSize: "10px", color: "var(--accent-emerald)" }}>
                {toast}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}