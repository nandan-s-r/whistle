"use client";
import { useEffect, useRef, useId } from "react";
import { useWorkspace } from "@/context/WorkspaceContext";
import {
  Company,
  EvidenceState,
  Source,
  date,
  initials,
} from "@/lib/workspace";
export function Icon({
  name = "arrow",
  size = 18,
}: {
  name?: string;
  size?: number;
}) {
  const paths: Record<string, React.ReactNode> = {
    list: <><path d="M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01"/></>,
    people: <><circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6m2 5a5 5 0 0 1 3 5v1"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></>,
    moon: <path d="M20.5 14.5A9 9 0 0 1 9.5 3.5a9 9 0 1 0 11 11z"/>,
    today: (
      <>
        <rect x="3" y="4" width="18" height="17" rx="3" />
        <path d="M7 2v4m10-4v4M3 10h18m-14 4h3m4 0h3m-10 3h3" />
      </>
    ),
    discover: (
      <>
        <circle cx="10" cy="10" r="6" />
        <path d="m15 15 6 6" />
      </>
    ),
    pipeline: (
      <>
        <rect x="3" y="4" width="5" height="16" rx="1" />
        <rect x="10" y="4" width="5" height="10" rx="1" />
        <rect x="17" y="4" width="4" height="13" rx="1" />
      </>
    ),
    portfolio: (
      <>
        <rect x="3" y="7" width="18" height="14" rx="3" />
        <path d="M8 7V3h8v4M3 13h18m-10-1v3h2v-3" />
      </>
    ),
    library: (
      <>
        <path d="M3 4h7l2 2 2-2h7v16h-7l-2 2-2-2H3zM12 6v16" />
      </>
    ),
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    check: <path d="m5 12 4 4L19 6" />,
    spark: (
      <>
        <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z" />
        <path d="m20 2 1 2 2 1" />
      </>
    ),
    source: (
      <>
        <path d="M6 3h9l4 4v14H6zM14 3v5h5m-10 4h6m-6 4h6" />
      </>
    ),
    alert: (
      <>
        <path d="m12 3 10 18H2zM12 9v5" />
        <circle cx="12" cy="17" r=".5" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    close: <path d="m6 6 12 12M6 18 18 6" />,
    plus: <path d="M12 4v16M4 12h16" />,
    bookmark: <path d="M6 3h12v18l-6-4-6 4z" />,
    compass: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m16 8-2.5 5.5L8 16l2.5-5.5z" />
      </>
    ),
    download: (
      <>
        <path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="m9 3-1 3-3 1-2 3 2 2-1 3 3 2 3-1 2 2 3-1 1-3 3-1 2-3-2-2 1-3-3-2-3 1-2-2z" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] ?? paths.arrow}
    </svg>
  );
}
export function EvidenceChip({
  state,
  count,
}: {
  state: EvidenceState | "AI draft" | "Needs review";
  count?: number;
}) {
  const tone =
    state === "Verified"
      ? "verified"
      : state === "Calculated"
        ? "calculated"
        : state === "AI-inferred" || state === "AI draft"
          ? "ai"
          : state === "Conflicted"
            ? "risk"
            : state === "Missing"
              ? "missing"
              : "review";
  return (
    <span className={`evidence-chip ${tone}`}>
      <Icon
        name={
          tone === "verified"
            ? "check"
            : tone === "risk"
              ? "alert"
              : tone === "ai"
                ? "spark"
                : tone === "calculated"
                  ? "source"
                  : "clock"
        }
        size={12}
      />
      {state}
      {count !== undefined && <span className="chip-count">{count}</span>}
    </span>
  );
}
export function Avatar({
  name,
  large = false,
}: {
  name: string;
  large?: boolean;
}) {
  return (
    <span className={`entity-avatar ${large ? "large" : ""}`}>
      {initials(name)}
    </span>
  );
}
export function Health({ company }: { company: Company }) {
  const verified = company.claims.filter((c) => c.state === "Verified").length;
  return (
    <>
      <div className="health-track" aria-hidden="true">
        {company.claims.map((c) => (
          <span
            key={c.id}
            className={
              c.state === "Verified"
                ? "verified"
                : c.state === "Conflicted"
                  ? "risk"
                  : "review"
            }
          />
        ))}
      </div>
      <span className="muted">
        {company.claims.length
          ? `${verified} verified · ${company.claims.length - verified} need attention`
          : "No claims captured"}
      </span>
    </>
  );
}
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}
export function Drawer({
  title,
  children,
  onClose,
  assistant = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  assistant?: boolean;
}) {
  const { error } = useWorkspace();
  const ref = useRef<HTMLElement>(null);
  const modal = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const prior = document.activeElement as HTMLElement | null;
    const panel = modal.current;
    const priorOverflow = document.body.style.overflow;
    panel?.showModal();
    document.body.style.overflow = "hidden";
    ref.current?.querySelector<HTMLElement>("button")?.focus();
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Tab") {
        const items = Array.from(
          ref.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled),a[href],input,select,textarea,[tabindex="0"]',
          ) ?? [],
        );
        const first = items[0],
          last = items.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      panel?.close();
      document.body.style.overflow = priorOverflow;
      prior?.focus();
    };
  }, []);
  return (
    <dialog ref={modal} className="drawer-backdrop" aria-label={title} aria-labelledby={titleId} onClick={onClose} onCancel={(event) => { event.preventDefault(); closeRef.current(); }}>
      <section
        className={`context-drawer${assistant ? " assistant-drawer" : ""}`}
        ref={ref}
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <div>
            <span className="eyebrow">RESEARCH CONTEXT</span>
            <h2 id={titleId}>{title}</h2>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close drawer"
          >
            <Icon name="close" />
          </button>
        </header>
        <div className="drawer-body" tabIndex={0}>
          {error && (
            <div className="notice error" role="alert">
              {error}
            </div>
          )}
          {children}
        </div>
      </section>
    </dialog>
  );
}
export function SourceCard({ source }: { source: Source }) {
  return (
    <article className="source-card">
      <div className="section-heading">
        <span className="source-id">{source.id}</span>
        <span className="mini-label">
          {source.illustrative
            ? "Illustrative source"
            : "Manually captured source"}
        </span>
      </div>
      <h3>{source.title}</h3>
      <blockquote>{source.excerpt}</blockquote>
      <dl className="detail-list">
        <div>
          <dt>Captured</dt>
          <dd>{date(source.captured_at)}</dd>
        </div>
        <div>
          <dt>Method</dt>
          <dd>{source.method}</dd>
        </div>
        <div>
          <dt>Original</dt>
          <dd>
            {source.url ? (
              <a href={source.url} target="_blank" rel="noreferrer">
                Open original ↗
              </a>
            ) : (
              <span>Demo file: {source.file?.replace("demo://", "")}</span>
            )}
          </dd>
        </div>
      </dl>
    </article>
  );
}
export function EvidenceDrawer({
  company,
  onClose,
  claimId,
  score = false,
}: {
  company: Company;
  onClose: () => void;
  claimId?: string;
  score?: boolean;
}) {
  const claim = company.claims.find((c) => c.id === claimId);
  const ids = claim
    ? company.evidence
        .filter((e) => e.claim_id === claim.id)
        .map((e) => e.source_id)
    : company.sources.map((s) => s.id);
  return (
    <Drawer
      title={
        score
          ? "Why this result appeared"
          : claim
            ? "Evidence behind the claim"
            : `${company.name} · sources`
      }
      onClose={onClose}
    >
      {company.illustrative && (
        <div className="notice">
          All companies and source excerpts in this scenario are fictional.
          “Verified” describes review within the demonstration.
        </div>
      )}
      {score && (
        <>
          <h3>
            Thesis fit{" "}
            <span className="mono">
              {company.fit_score === null
                ? "Not assessed"
                : `${company.fit_score}/100`}
            </span>
          </h3>
          <p className="muted">
            {company.fit_score === null
              ? "Capture and review sources before assessing thesis fit. Company intake does not create a score."
              : "Illustrative, additive rubric. This score is not an investment recommendation or success probability."}
          </p>
          {Object.entries(company.fit_dimensions).map(([label, value]) => (
            <div key={label} className="dimension">
              <span>{label}</span>
              <strong className="mono">{value}</strong>
            </div>
          ))}
          <ul className="reason-list">
            {company.reason_codes.map((r) => (
              <li key={r}>
                <Icon name="check" size={14} />
                {r}
              </li>
            ))}
          </ul>
        </>
      )}
      {claim && (
        <>
          <EvidenceChip state={claim.state} />
          <h3 className="drawer-claim">{claim.statement}</h3>
          <p className="muted">Next question: {claim.question}</p>
          {claim.calculation && (
            <p className="notice">Calculation: {claim.calculation}</p>
          )}
          {company.reviews
            .filter((r) => r.claim_id === claim.id)
            .slice()
            .reverse()
            .map((r) => (
              <article key={r.id} className="saved-note">
                <strong>
                  {r.previous} → {r.current}
                </strong>
                <p>{r.rationale || "No rationale recorded"}</p>
                <small>
                  {r.reviewer} · {date(r.at)}
                </small>
                {r.previous_statement !== r.current_statement && (
                  <p className="muted">
                    Previous statement:{" "}
                    {r.previous_statement || "No previous statement"}
                  </p>
                )}
              </article>
            ))}
        </>
      )}
      {company.sources
        .filter((s) => ids.includes(s.id))
        .map((s) => (
          <SourceCard source={s} key={s.id} />
        ))}
      {ids.length === 0 && (
        <div className="empty-state">
          <Icon name="source" />
          <h3>No evidence found</h3>
          <p>Ask the next diligence question before verifying this claim.</p>
        </div>
      )}
      {claim &&
        company.evidence
          .filter((e) => e.claim_id === claim.id)
          .map((e) => (
            <p key={e.id} className="muted">
              {e.id} · {e.confidence}% evidence confidence · Reviewer:{" "}
              {e.reviewer ?? "Not reviewed"}
              {e.last_reviewed_at ? ` · ${date(e.last_reviewed_at)}` : ""}
            </p>
          ))}
    </Drawer>
  );
}
export function downloadText(name: string, text: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/plain;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
