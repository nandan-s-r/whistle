"use client";
import { createContext, useContext, useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabaseBrowser, supabaseConfigured } from "@/lib/supabase";
interface User {
  email: string;
  name: string;
}
interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
  isLoading: boolean;
  passwordRecovery: boolean;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);
// Compatibility for original pages using fetch directly. Never attach tokens to an unrelated origin.
if (typeof window !== "undefined") {
  const target = window as Window & { __fetch_intercepted?: boolean };
  if (!target.__fetch_intercepted) {
    target.__fetch_intercepted = true;
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const raw =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      const url = new URL(raw, window.location.origin);
      const configured = process.env.NEXT_PUBLIC_API_BASE;
      const allowed =
        url.origin === window.location.origin ||
        url.origin === "http://127.0.0.1:8000" ||
        url.origin === "http://localhost:8000" ||
        Boolean(
          configured &&
          url.origin === new URL(configured, window.location.origin).origin,
        );
      if (allowed && url.pathname.startsWith("/api/")) {
        const stored = localStorage.getItem("vc_os_token");
        if (stored) {
          const headers = new Headers(
            init?.headers ??
              (input instanceof Request ? input.headers : undefined),
          );
          if (!headers.has("Authorization"))
            headers.set("Authorization", `Bearer ${stored}`);
          init = { ...init, headers };
        }
      }
      return originalFetch(input, init);
    };
  }
}
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const recoveryIdentity = useRef<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    const stored = window.location.pathname === "/reset-password" ? null : localStorage.getItem("vc_os_token");
    const rememberRecovery = (event: string, identity?: string) => {
      if (event === "PASSWORD_RECOVERY" && identity) {
        recoveryIdentity.current = identity;
        setPasswordRecovery(true);
      } else if (!identity || (recoveryIdentity.current && recoveryIdentity.current !== identity)) {
        recoveryIdentity.current = null;
        setPasswordRecovery(false);
      }
    };
    if (!stored && supabaseConfigured) {
      const client = supabaseBrowser();
      let disposed = false;
      const { data: subscription } = client.auth.onAuthStateChange(
        (event, session) => {
          if (disposed) return;
          rememberRecovery(event, session?.user.id);
          setToken(session?.access_token ?? null);
          setUser(
            session
              ? {
                  email: session.user.email ?? "",
                  name: session.user.user_metadata.full_name ?? "Analyst",
                }
              : null,
          );
          setLoading(false);
        },
      );
      client.auth.getSession().then(({ data, error }) => {
        if (disposed) return;
        if (error)
          setError(
            "Unable to restore your Supabase session. Please sign in again.",
          );
        setToken(data.session?.access_token ?? null);
        setUser(
          data.session
            ? {
                email: data.session.user.email ?? "",
                name: data.session.user.user_metadata.full_name ?? "Analyst",
              }
            : null,
        );
        setLoading(false);
      });
      return () => {
        disposed = true;
        subscription.subscription.unsubscribe();
      };
    }
    if (!stored) {
      Promise.resolve().then(() => setLoading(false));
      return;
    }
    const controller = new AbortController();
    const subscription = supabaseConfigured
      ? supabaseBrowser().auth.onAuthStateChange((event, session) => {
          if (localStorage.getItem("vc_os_token")) return;
          rememberRecovery(event, session?.user.id);
          setToken(session?.access_token ?? null);
          setUser(
            session
              ? {
                  email: session.user.email ?? "",
                  name: session.user.user_metadata.full_name ?? "Analyst",
                }
              : null,
          );
        })
      : null;
    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${stored}` },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (response.status === 401) {
          localStorage.removeItem("vc_os_token");
          return null;
        }
        if (!response.ok)
          throw new Error("The sign-in service is unavailable. Please retry.");
        return response.json();
      })
      .then((data) => {
        if (data) {
          setToken(stored);
          setUser({ email: data.email, name: data.name });
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(
            e instanceof Error ? e.message : "Unable to restore your session.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => {
      controller.abort();
      subscription?.data.subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    const publicRoutes = [
      "/login",
      "/signup",
      "/reset-password",
      "/about",
      "/privacy",
      "/terms",
      "/cookies",
      "/contact",
    ];
    if (
      !isLoading &&
      !token &&
      !error &&
      !publicRoutes.some((p) => pathname.startsWith(p))
    )
      router.replace("/login");
  }, [token, isLoading, pathname, router, error]);
  const login = (newToken: string, newUser: User) => {
    let cloud = false;
    try {
      cloud =
        JSON.parse(
          atob(newToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
        ).iss ===
        process.env.NEXT_PUBLIC_SUPABASE_URL + "/auth/v1";
    } catch {}
    if (!cloud) localStorage.setItem("vc_os_token", newToken);
    else localStorage.removeItem("vc_os_token");
    setToken(newToken);
    setUser(newUser);
    setError("");
    router.push("/");
  };
  const logout = async () => {
    localStorage.removeItem("vc_os_token");
    recoveryIdentity.current = null;
    setPasswordRecovery(false);
    if (supabaseConfigured) {
      const { error: signOutError } = await supabaseBrowser().auth.signOut();
      if (signOutError) { setError("Cloud sign-out could not be confirmed. Retry before leaving a shared computer."); return; }
    }
    setToken(null);
    setUser(null);
    setError("");
    router.push("/login");
  };
  useEffect(() => {
    if (!token || !localStorage.getItem("vc_os_token")) return;
    let expires = 0;
    try { expires = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).exp * 1000; } catch { return; }
    if (!Number.isFinite(expires) || expires <= 0) return;
    const timer = window.setTimeout(() => {
      localStorage.removeItem("vc_os_token"); setToken(null); setUser(null); router.replace("/login");
    }, Math.max(0, Math.min(expires - Date.now(), 2147483647)));
    const changed = (event: StorageEvent) => {
      if (event.key === "vc_os_token" && !event.newValue) { setToken(null); setUser(null); router.replace("/login"); }
    };
    window.addEventListener("storage", changed);
    return () => { window.clearTimeout(timer); window.removeEventListener("storage", changed); };
  }, [token, router]);
  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading, passwordRecovery }}>
      {isLoading ? (
        <div
          className="auth-stage"
          style={{ display: "grid", placeItems: "center" }}
        >
          Opening your workspace…
        </div>
      ) : error ? (
        <div
          className="auth-stage"
          style={{ display: "grid", placeItems: "center" }}
        >
          <div role="alert">
            <p>{error}</p>
            <button
              className="ws-button secondary"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
            <button className="ws-button secondary" onClick={logout}>
              Return to sign in
            </button>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthProvider is missing");
  return value;
}
