"use client";
import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { supabaseBrowser, supabaseConfigured } from "@/lib/supabase";
import { Icon } from "@/components/workspace/Primitives";
import AuthStory from "@/components/workspace/AuthStory";
import { authFailureMessage, needsEmailConfirmation } from "@/lib/authFeedback";
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmationNeeded, setConfirmationNeeded] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const { login } = useAuth();
  const [local, setLocal] = useState(
    !supabaseConfigured,
  );
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setConfirmationNeeded(false);
    setLoading(true);
    try {
      if (supabaseConfigured && !local) {
        const { data, error } = await supabaseBrowser().auth.signInWithPassword(
          { email: email.trim(), password },
        );
        if (error) throw error;
        if (!data.session) throw new Error("Missing sign-in session");
        login(data.session.access_token, {
          email: data.user.email ?? email,
          name: data.user.user_metadata.full_name ?? "Analyst",
        });
        return;
      }
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username: email.trim(), password }),
        signal: AbortSignal.timeout(55000),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Unable to sign in. Check your credentials.",
        );
      login(data.access_token, data.user);
    } catch (e) {
      setConfirmationNeeded(!local && needsEmailConfirmation(e));
      setError(
        !local && supabaseConfigured
          ? authFailureMessage(e)
          : e instanceof Error
          ? e.message
          : "Unable to reach the sign-in service. Please retry.",
      );
    } finally {
      setLoading(false);
    }
  }
  async function sendEmail(kind: "recovery" | "confirmation") {
    if (!email.trim()) { setError("Enter your email address first."); return; }
    setLoading(true); setSendingEmail(true); setError(""); setMessage("");
    try {
      const auth = supabaseBrowser().auth;
      const { error } = kind === "confirmation"
        ? await auth.resend({ type: "signup", email: email.trim(), options: { emailRedirectTo: window.location.origin + "/auth/confirm" } })
        : await auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin + "/reset-password" });
      if (error) throw error;
      setMessage(kind === "confirmation"
        ? "If this account needs confirmation, you’ll receive an email. Check your inbox and spam folder, then open the link in this browser."
        : "If this email has an account, you’ll receive a password recovery link. Open it in this browser.");
    } catch (e) { setError(authFailureMessage(e, "email")); }
    finally { setLoading(false); setSendingEmail(false); }
  }
  return (
    <div className="auth-stage">
      <AuthStory/>
      <section className="auth-form-stage">
        <div className="auth-form-container">
          <span className="eyebrow">WHISTLE</span>
          <h2>Sign in.</h2>
          <p>
            {supabaseConfigured && !local
              ? "Open your company research, models and memos."
              : "Open your company research, models and memos in this local preview."}
          </p>
          <p className="auth-password-help">{local ? "Local preview account · saved on this computer. Cloud accounts have separate credentials and records." : "Cloud account · your saved workspace is available when you return. Local preview accounts are separate."}</p>
          {message && <p className="notice" role="status">{message}</p>}
          <form className="auth-form" onSubmit={submit}>
            {error && (
              <div className="auth-error" role="alert">
                {error}
              </div>
            )}
            <label htmlFor="login-email">
              Email address
              <input
                id="login-email"
                type="email"
                autoComplete="username"
                required
                placeholder="you@yourfirm.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label htmlFor="login-password">
              Password
              <div className="auth-password">
                <input
                  id="login-password"
                  aria-label="Password"
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  aria-label={show ? "Hide password" : "Show password"}
                >
                  {show ? "Hide" : "Show"}
                </button>
              </div>
            </label>
            <button className="ws-button primary" disabled={loading}>
              {loading ? (sendingEmail ? "Sending email…" : "Signing in…") : "Sign in to workspace"}
              <Icon size={16} />
            </button>
          </form>
          {supabaseConfigured &&
            process.env.NEXT_PUBLIC_LOCAL_AUTH === "true" && (
              <button
                className="ws-button secondary auth-mode-toggle"
                type="button"
                disabled={loading}
                onClick={() => {
                  setLocal(!local);
                  setPassword("");
                  setShow(false);
                  setError("");
                  setMessage("");
                  setConfirmationNeeded(false);
                }}
              >
                {local ? "Use cloud sign-in" : "Use local preview"}
              </button>
            )}
          {!local && supabaseConfigured && <>
            {confirmationNeeded && <button type="button" className="text-link" disabled={loading} onClick={() => void sendEmail("confirmation")}>Resend confirmation email</button>}
            <button type="button" className="text-link" disabled={loading} onClick={() => void sendEmail("recovery")}>Forgot password?</button>
          </>}
          <p className="auth-signup">
            New to Whistle? <Link href="/signup">Create an account</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
