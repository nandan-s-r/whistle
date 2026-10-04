"use client";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import AuthStory from "@/components/workspace/AuthStory";
import { Icon } from "@/components/workspace/Primitives";
import { supabaseBrowser, supabaseConfigured } from "@/lib/supabase";
import { responseErrorMessage } from "@/lib/workspace";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const { login } = useAuth();
  const [local, setLocal] = useState(
    !supabaseConfigured,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (supabaseConfigured && !local) {
        const { data, error } = await supabaseBrowser().auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: window.location.origin + "/auth/confirm",
          },
        });
        if (error) throw new Error(error.message);
        if (data.session)
          login(data.session.access_token, { email, name: fullName });
        else
          setMessage("Check your email to confirm your account, then sign in.");
        return;
      }
      // Use relative URL so the Next.js rewrite proxy handles it
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, full_name: fullName }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(responseErrorMessage(data, "Could not create your account. Please try again."));
      }

      const data = await res.json();
      login(data.access_token, data.user);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Unable to create your account.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-stage">
      <AuthStory/>
      <section className="auth-form-stage">
        <div className="auth-form-container">
          <span className="eyebrow">WHISTLE</span>
          <h2>Create your workspace.</h2>
          <p>Add your own company and its sources, or explore a fictional sample.{!local && supabaseConfigured ? " Your account uses cloud sign-in." : " This account is for the local preview."}</p>
          {message && <div className="notice" role="status">{message}<Link href="/login" className="text-link">Go to sign in</Link></div>}
          <form className="auth-form" onSubmit={handleSubmit}>
            {error && <div className="auth-error" role="alert">{error}</div>}
            <label htmlFor="signup-name">Full name<input id="signup-name" autoComplete="name" value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="Your name"/></label>
            <label htmlFor="signup-email">Email address<input id="signup-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@yourfirm.com"/></label>
            <label htmlFor="signup-password">Password<input id="signup-password" type="password" autoComplete="new-password" minLength={8} maxLength={72} value={password} onChange={e => setPassword(e.target.value)} required placeholder="Choose a strong password" aria-describedby="password-guidance"/></label>
            <p id="password-guidance" className="auth-password-help">At least 8 characters, with uppercase, lowercase, a number and a symbol.</p>
            <button className="ws-button primary" disabled={loading}>{loading ? "Creating your workspace…" : "Create workspace"}<Icon size={16}/></button>
          </form>
          {supabaseConfigured && process.env.NEXT_PUBLIC_LOCAL_AUTH === "true" && <button className="auth-mode-toggle" type="button" onClick={() => {setLocal(!local);setPassword("");setError("");setMessage("");}}>{local ? "Use cloud sign-up" : "Use local preview"}</button>}
          <p className="auth-switch">Already have a workspace? <Link href="/login">Sign in</Link></p>
          <div className="auth-privacy"><Icon name="source" size={15}/><span>Your sources and decisions belong to your account.</span></div>
        </div>
      </section>
    </div>
  );
}
