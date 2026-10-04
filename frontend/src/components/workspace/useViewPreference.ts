"use client";
import { useCallback, useSyncExternalStore } from "react";
import { useAuth } from "@/context/AuthContext";
const memoryValues = new Map<string, string>();

// Only presentation choices are retained. Research and credentials stay out of this store.
export function useViewPreference(name: string, fallback: string, options: readonly string[]) {
  const { user } = useAuth();
  const key = `vc-scope:view:v1:${user?.email.toLowerCase() ?? "signed-out"}:${name}`;
  const subscribe = useCallback((notify: () => void) => {
    window.addEventListener("vc-scope-view", notify);
    return () => window.removeEventListener("vc-scope-view", notify);
  }, []);
  const snapshot = useCallback(() => {
    try {
      const value = memoryValues.get(key) ?? sessionStorage.getItem(key);
      return value && options.includes(value) ? value : fallback;
    } catch { return memoryValues.get(key) ?? fallback; }
  }, [key, fallback, options]);
  const value = useSyncExternalStore(subscribe, snapshot, () => fallback);
  const update = (next: string) => {
    if (!options.includes(next)) return;
    memoryValues.set(key, next);
    try { sessionStorage.setItem(key, next); } catch { /* The view still works when storage is unavailable. */ }
    window.dispatchEvent(new Event("vc-scope-view"));
  };
  return [value, update] as const;
}
