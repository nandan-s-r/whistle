"use client";

import { useSyncExternalStore } from "react";
import { Icon } from "./Primitives";

const key = "vc-scope:theme:v1";
const change = "vc-scope-theme";

function currentTheme() {
  return document.documentElement.dataset.theme === "dark";
}

function subscribe(notify: () => void) {
  const sync = (event: StorageEvent) => {
    if (event.key !== key && event.key !== null) return;
    document.documentElement.dataset.theme = event.newValue === "dark" ? "dark" : "light";
    notify();
  };
  window.addEventListener(change, notify);
  window.addEventListener("storage", sync);
  return () => {
    window.removeEventListener(change, notify);
    window.removeEventListener("storage", sync);
  };
}

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const dark = useSyncExternalStore(subscribe, currentTheme, () => false);
  const action = dark ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      type="button"
      role="switch"
      aria-label="Dark mode"
      aria-checked={dark}
      title={action}
      className={`theme-toggle ${className}`}
      onClick={() => {
        const next = dark ? "light" : "dark";
        document.documentElement.dataset.theme = next;
        try { localStorage.setItem(key, next); } catch { /* Switching still works when preference storage is blocked. */ }
        window.dispatchEvent(new Event(change));
      }}
    >
      <Icon name={dark ? "sun" : "moon"} size={19} />
    </button>
  );
}
