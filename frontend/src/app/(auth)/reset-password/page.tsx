"use client";
import { useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import AuthStory from "@/components/workspace/AuthStory";

export default function ResetPassword() {
  const { passwordRecovery: ready } = useAuth(); const [password, setPassword] = useState("");
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const [done, setDone] = useState(false);
  // AuthProvider retains the recovery event received during client initialization,
  // before this page mounts. The browser client alone owns PKCE exchange.
  async function update(e: React.FormEvent) {
    e.preventDefault(); if (!ready) return; setBusy(true); setError("");
    try {
      const { error } = await supabaseBrowser().auth.updateUser({ password });
      if (error) throw new Error("The password could not be updated. Check the password requirements or request a new recovery link.");
      await supabaseBrowser().auth.signOut(); setPassword(""); setDone(true);
    } catch (e) { setError(e instanceof Error ? e.message : "Password recovery is unavailable."); }
    finally { setBusy(false); }
  }
  return <div className="auth-stage"><AuthStory/><section className="auth-form-stage"><div className="auth-form-container"><h2>Reset your password</h2>
    {done ? <p className="notice" role="status">Your password is updated. Sign in with your new password.</p> : ready ? <form className="auth-form" onSubmit={e => void update(e)}><label htmlFor="recovery-password">New password<input id="recovery-password" type="password" autoComplete="new-password" minLength={8} maxLength={72} required value={password} onChange={e => setPassword(e.target.value)}/></label><p className="auth-password-help">Use uppercase, lowercase, a number and a symbol.</p><button className="ws-button primary" disabled={busy}>{busy ? "Updating…" : "Update password"}</button></form> : <p>Open the recovery link sent to your email in the same browser. If it expired, request a new link from sign-in.</p>}
    {error && <p className="auth-error" role="alert">{error}</p>}<Link href="/login" className="text-link">Return to sign in</Link></div></section></div>;
}
