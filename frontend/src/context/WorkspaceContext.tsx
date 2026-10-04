"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import { supabaseBrowser, supabaseConfigured } from "@/lib/supabase";
import { trackWorkflow } from "@/lib/telemetry";
import { Company, WorkspaceData, workspaceFetch } from "@/lib/workspace";

interface WorkspaceContextValue {
  data: WorkspaceData | null;
  loading: boolean;
  error: string;
  busy: boolean;
  toast: string;
  refresh: () => Promise<void>;
  initialize: () => Promise<void>;
  createCompany: (payload: Record<string, unknown>) => Promise<Company | null>;
  act: (
    company: Company,
    payload: Record<string, unknown>,
  ) => Promise<Company | null>;
  dismissToast: () => void;
}
const Context = createContext<WorkspaceContextValue | null>(null);
export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 8000);
    return () => window.clearTimeout(timer);
  }, [toast]);
  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const next = await workspaceFetch<WorkspaceData>("", token);
      setData(next);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load workspace.");
    } finally {
      setLoading(false);
    }
  }, [token]);
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    workspaceFetch<WorkspaceData>("", token, { signal: controller.signal })
      .then((next) => {
        setData(next);
        setError("");
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(
            e instanceof Error ? e.message : "Unable to load workspace.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [token]);
  useEffect(() => {
    if (!token || !supabaseConfigured || localStorage.getItem("vc_os_token"))
      return;
    const client = supabaseBrowser();
    let disposed = false;
    let channel: ReturnType<typeof client.channel> | null = null;
    client.auth.getUser().then(({ data }) => {
      if (disposed || !data.user) return;
      channel = client
        .channel("vc-workspace-" + data.user.id)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "vc_companies",
            filter: "owner_id=eq." + data.user.id,
          },
          () => {
            void refresh();
          },
        )
        .subscribe();
    });
    return () => {
      disposed = true;
      if (channel) void client.removeChannel(channel);
    };
  }, [token, refresh]);
  const initialize = async () => {
    if (!token) return;
    setBusy(true);
    setError("");
    try {
      await workspaceFetch("/demo", token, { method: "POST" });
      await refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to initialize scenario.",
      );
    } finally {
      setBusy(false);
    }
  };
  const act = async (company: Company, payload: Record<string, unknown>) => {
    if (!token || busy) return null;
    if(company.can_write===false){setError('You have read-only access to this fund record. Ask its administrator to review your deal permissions.');return null;}
    setBusy(true);
    setError("");
    try {
      const updated = await workspaceFetch<Company>(
        `/companies/${company.id}/actions`,
        token,
        {
          method: "POST",
          body: JSON.stringify({ ...payload, revision: company.revision }),
        },
      );
      const events: Record<string, Parameters<typeof trackWorkflow>[0]> = {
        capture_source: "source_capture",
        review: "claim_review",
        screen: "screen",
        decision: "decision",
        model: "model",
        memo: "memo",
        review_draft: "draft_review",
      };
      if (events[String(payload.action)])
        trackWorkflow(events[String(payload.action)], true);
      setData((current) =>
        current
          ? {
              ...current,
              companies: current.companies.map((c) =>
                c.id === updated.id ? updated : c,
              ),
            }
          : current,
      );
      setToast(
        `${updated.name} saved · revision ${updated.revision}. Review history updated.`,
      );
      return updated;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save.");
      return null;
    } finally {
      setBusy(false);
    }
  };
  const createCompany = async (payload: Record<string, unknown>) => {
    if (!token || busy) return null;
    setBusy(true);
    setError("");
    try {
      const result = await workspaceFetch<{
        company: Company;
        created: boolean;
      }>("/companies", token, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setData((current) =>
        current
          ? {
              ...current,
              companies: current.companies.some(
                (c) => c.id === result.company.id,
              )
                ? current.companies
                : [...current.companies, result.company],
            }
          : current,
      );
      setToast(
        result.created
          ? `${result.company.name} captured. Add a source to start evidence review.`
          : `${result.company.name} already exists. Opened the existing record; its research was preserved.`,
      );
      return result.company;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to capture company.");
      return null;
    } finally {
      setBusy(false);
    }
  };
  return (
    <Context.Provider
      value={{
        data,
        loading,
        error,
        busy,
        toast,
        refresh,
        initialize,
        createCompany,
        act,
        dismissToast: () => setToast(""),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useWorkspace() {
  const value = useContext(Context);
  if (!value) throw new Error("WorkspaceProvider is missing");
  return value;
}
