"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { WorkspaceProvider, useWorkspace } from "@/context/WorkspaceContext";
import { reviewQueue } from "@/lib/workspace";
import { Avatar, Icon } from "./Primitives";
import { WorkspaceGuide } from "./ResearchExperience";
import ThemeToggle from "./ThemeToggle";
import { ScopeBrand } from "./Brand";
import WelcomeDesk from "./WelcomeDesk";
const nav = [
  ["Today", "/", "today"],
  ["Discover", "/discover", "discover"],
  ["Pipeline", "/pipeline", "pipeline"],
  ["Portfolio", "/portfolio", "portfolio"],
  ["Library", "/library", "library"],
];

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const {
    data,
    error,
    loading,
    busy,
    toast,
    refresh,
    initialize,
    dismissToast,
  } = useWorkspace();
  const [command, setCommand] = useState(false);
  const [query, setQuery] = useState("");
  const commandPanel = useRef<HTMLElement>(null);
  const commandTrigger = useRef<HTMLButtonElement>(null);
  const accountMenu = useRef<HTMLDetailsElement>(null);
  const newRoute =
    pathname === "/" ||
    pathname === "/reviews" ||
    ["/discover", "/pipeline", "/portfolio", "/library", "/companies"].some(
      (p) => pathname.startsWith(p),
    );
  useEffect(() => {
    function dismissAccount(event: PointerEvent) {
      if (!accountMenu.current?.contains(event.target as Node)) accountMenu.current?.removeAttribute("open");
    }
    document.addEventListener("pointerdown", dismissAccount, { passive: true });
    return () => document.removeEventListener("pointerdown", dismissAccount);
  }, []);
  useEffect(() => {
    function keyboard(e: KeyboardEvent) {
      if (document.querySelector("dialog[open]")) return;
      const editing = (e.target as HTMLElement).matches(
        "input,textarea,select,[contenteditable]",
      );
      if (
        ((e.ctrlKey || e.metaKey) && e.key === "k") ||
        (!editing && e.key === "/")
      ) {
        e.preventDefault();
        setCommand(true);
      }
      if (e.key === "Escape") setCommand(false);
    }
    document.addEventListener("keydown", keyboard);
    return () => document.removeEventListener("keydown", keyboard);
  }, []);
  useEffect(() => {
    if (!command) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function keepFocus(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const targets = commandPanel.current?.querySelectorAll<HTMLElement>(
        "button:not(:disabled), input, a[href]",
      );
      if (!targets?.length) return;
      const first = targets[0],
        last = targets[targets.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
      if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", keepFocus);
    const trigger = commandTrigger.current;
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", keepFocus);
      trigger?.focus();
    };
  }, [command]);
  if (!user) return null;
  const pending = reviewQueue(data?.companies ?? []).length;
  return (
    <div className="workspace-shell">
      <a className="skip-link" href="#workspace-main">
        Skip to workspace
      </a>
      <aside className="research-sidebar">
        <ScopeBrand/>
        <div className="workspace-identity">
          <span className="workspace-monogram">
            {user?.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)}
          </span>
          <div>
            <strong>{user?.name.split(" ")[0]}&apos;s workspace</strong>
            <span>Personal research</span>
          </div>
          <span className="workspace-dot" />
        </div>
        <div className="sidebar-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {nav.map(([label, href, icon]) => (
            <Link
              key={href}
              href={href}
              title={label}
              aria-current={
                (href === "/" ? pathname === "/" || pathname === "/reviews" : pathname.startsWith(href))
                  ? "page"
                  : undefined
              }
              className={`research-nav ${(href === "/" ? pathname === "/" || pathname === "/reviews" : pathname.startsWith(href)) ? "active" : ""}`}
            >
              <Icon name={icon} />
              <span>{label}</span>
              {label === "Today" && pending > 0 && (
                <span className="nav-counter">{pending}</span>
              )}
            </Link>
          ))}
        </nav>
        {!!data?.companies.length && (
          <div className="sidebar-records">
            <div className="sidebar-label">SAVED RESEARCH</div>
            {data.companies.slice(0, 3).map((company) => (
              <Link key={company.id} href={`/companies/${company.id}`}>
                <Avatar name={company.name} />
                <span>{company.name}<small>{company.illustrative ? "Demo case" : "Captured research"}</small></span>
                <Icon size={13} />
              </Link>
            ))}
          </div>
        )}
        <Link className="sidebar-settings" href="/library?section=Connections%20%26%20imports" aria-label="Connections & settings">
          <Icon name="settings" size={16} /><span>Connections & settings</span>
        </Link>
        <div className="sidebar-footer">
          <span className="profile-avatar">{user.name?.[0] ?? "N"}</span>
          <div>
            <strong>{user.name}</strong>
            <span>{data?.role ?? "Investment team"}</span>
          </div>
          <button onClick={logout} aria-label="Sign out" title="Sign out">
            ↪
          </button>
        </div>
      </aside>
      <div className="research-stage">
        <header className="workspace-topbar">
          <div className="breadcrumb">
            Workspace <span>/</span>{" "}
            <strong>
              {pathname.startsWith("/companies")
                ? (data?.companies.find((c) => pathname === `/companies/${c.id}`)?.name ?? "Company research")
                : (pathname === "/reviews" ? "Today / Reviews" : nav.find(([, h]) => h === pathname)?.[0] ??
                  "Existing tools")}
            </strong>
          </div>
          <div className="topbar-actions">
            <WorkspaceGuide companies={data?.companies ?? []} />
            <ThemeToggle />
            <button
              className="search-launch"
              ref={commandTrigger}
              aria-label="Find companies or destinations"
              onClick={() => setCommand(true)}
            >
              <Icon name="discover" size={16} />
              <span>Search</span>
              <kbd>Ctrl K</kbd>
            </button>
            <span className="topbar-divider" />
            <details className="account-menu" ref={accountMenu} onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.currentTarget.removeAttribute("open");
                event.currentTarget.querySelector("summary")?.focus();
              }
            }}>
              <summary aria-label="Account options"><span className="profile-avatar small">{user.name?.[0] ?? "N"}</span></summary>
              <div className="account-options">
                <strong>{user.name}</strong><span>{data?.role ?? "Investment team"}</span>
                <Link href="/library?section=Connections%20%26%20imports" onClick={(event) => event.currentTarget.closest("details")?.removeAttribute("open")}><Icon name="settings" size={16}/>Connections & settings</Link>
                <button onClick={logout} aria-label="Sign out of workspace"><Icon name="arrow" size={16}/>Sign out</button>
              </div>
            </details>
          </div>
        </header>
        <main
          id="workspace-main"
          className={newRoute ? "workspace-main" : "legacy-surface"}
        >
          {newRoute && data?.companies.some(company => company.illustrative) && (
            <div className="demo-ribbon">
              <Icon name="source" size={14} />
              <span>
                <strong>Demo records</strong>
                <span className="ribbon-detail">
                  {" "}
                  · Fictional examples are labelled throughout the workspace.
                </span>
              </span>
              <Link className="ribbon-end" href="/library?section=Source%20policy">
                Sources & standards <Icon size={12} />
              </Link>
            </div>
          )}
          {error && (
            <div className="workspace-error" role="alert">
              <Icon name="alert" />
              <span>{error}</span>
              <button
                className="ws-button secondary"
                onClick={() => void refresh()}
              >
                Refresh & retry
              </button>
            </div>
          )}
          {!!data?.quarantined_records?.length && <div className="workspace-error" role="alert"><Icon name="alert"/><div><strong>{data.quarantined_records.length} saved {data.quarantined_records.length === 1 ? "record needs" : "records need"} repair</strong><p>Lists and totals include valid records only. Your other research remains available. Ask the owner or fund administrator to restore the affected record from its history.</p><details><summary>Affected record references</summary>{data.quarantined_records.map(record => <p key={record.id}>{record.id} · revision {record.revision}</p>)}</details><Link className="text-link" href="/library?section=Fund%20access">Open fund access</Link></div></div>}
          {newRoute && loading ? (
            <div className="workspace-loading" role="status">
              <div className="skeleton title" />
              <div className="skeleton subtitle" />
              <div className="skeleton-grid">
                {[1, 2, 3].map((n) => (
                  <div className="skeleton" key={n} />
                ))}
              </div>
              <p>Loading your research workspace…</p>
            </div>
          ) : newRoute &&
            pathname !== "/discover" &&
            pathname !== "/library" &&
            pathname !== "/pipeline" &&
            pathname !== "/reviews" &&
            !pathname.startsWith("/companies/") &&
            data &&
            data.companies.length === 0 && !data.quarantined_records?.length ? (
            <WelcomeDesk pathname={pathname} busy={busy} initialize={() => void initialize()}/>
          ) : (
            children
          )}
        </main>
      </div>
      {toast && (
        <div className="workspace-toast" role="status">
          <Icon name="check" />
          <span>{toast}</span>
          <button
            className="icon-button"
            onClick={dismissToast}
            aria-label="Dismiss notification"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
      {command && (
        <div className="command-backdrop" onClick={() => setCommand(false)}>
          <section
            ref={commandPanel}
            className="command-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Find in workspace"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="command-input">
              <Icon name="discover" />
              <input
                autoFocus
                aria-label="Find companies or destinations"
                placeholder="Find a company or go to a workspace…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setCommand(false);
                }}
              />
              <button
                className="icon-button"
                aria-label="Close search"
                onClick={() => setCommand(false)}
              >
                <Icon name="close" />
              </button>
            </div>
            {[...nav, ["Reviews", "/reviews", "today"]]
              .filter(([name]) =>
                name.toLowerCase().includes(query.toLowerCase()),
              )
              .map(([name, href, icon]) => (
                <button
                  className="command-result"
                  key={name}
                  onClick={() => {
                    setCommand(false);
                    router.push(href);
                  }}
                >
                  <Icon name={icon} />
                  {name}
                  <Icon size={14} />
                </button>
              ))}
            {data?.companies
              .filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
              .map((c) => (
                <button
                  className="command-result"
                  key={c.id}
                  onClick={() => {
                    setCommand(false);
                    router.push(`/companies/${c.id}`);
                  }}
                >
                  <Icon name="pipeline" />
                  {c.name}
                  <span className="muted">{c.sector}</span>
                </button>
              ))}
          </section>
        </div>
      )}
    </div>
  );
}
export default function WorkspaceShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WorkspaceProvider>
      <Shell>{children}</Shell>
    </WorkspaceProvider>
  );
}
