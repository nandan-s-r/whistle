"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useLayoutEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import {
  Assumption,
  Audit,
  Company,
  Disposition,
  EvidenceState,
  ModelInputs,
  date,
  money,
  triggerFired,
  workspaceFetch,
} from "@/lib/workspace";
import {
  Avatar,
  Drawer,
  EvidenceChip,
  EvidenceDrawer,
  Health,
  Icon,
  SourceCard,
  downloadText,
} from "./Primitives";
import { SourceCaptureForm } from "./IntakeForms";
import DiligencePlan from "./DiligencePlan";
import MemoReview, { ReviewPack } from "./MemoReview";
import { MemoReader, ResearchOrientation } from "./ResearchExperience";
import { ArtifactDownload, MemoEditor, PresentationStudio, ReviewAgenda } from "./ReviewStudio";

import type { AssumptionNote } from "./ModelReview";
import type { CalculationSelection } from "./ModelCalculation";
const ModelComparison = dynamic(() => import("./ModelReview").then(m => m.ModelComparison));
const AssumptionEditor = dynamic(() => import("./ModelReview").then(m => m.AssumptionEditor));
const ModelCalculation = dynamic(() => import("./ModelCalculation"));
const RiskRegister = dynamic(() => import("./RiskRegister"));
const DecisionLoop = dynamic(() => import("./DecisionLoop"));
const DecisionChanges = dynamic(() => import('./InvestmentMemory').then(m=>m.DecisionChanges));
const OperatingForecast = dynamic(() => import('./OperatingForecast'));

const tabs = ["Overview", "Evidence", "Diligence", "Model", "Memo", "Monitor"];
const states: EvidenceState[] = [
  "Unreviewed",
  "Verified",
  "Founder-reported",
  "Calculated",
  "AI-inferred",
  "Missing",
  "Conflicted",
];
function DecisionForm({
  company,
  onClose,
}: {
  company: Company;
  onClose: () => void;
}) {
  const { act, busy } = useWorkspace();
  const [disposition, setDisposition] = useState<Disposition>(
    company.disposition === "Unreviewed" ? "Watch" : company.disposition,
  );
  const [rationale, setRationale] = useState("");
  const [objections, setObjections] = useState("");
  const [trigger, setTrigger] = useState(company.next_action);
  const [memoVersion, setMemoVersion] = useState(
    company.memos.at(-1)?.version ?? 0,
  );
  return (
    <Drawer title="Record your investment judgment" onClose={onClose}>
      <p className="muted">
        The analyst owns this decision. Each saved version preserves the
        rationale, dissent, trigger and current model version.
      </p>
      <form
        className="workspace-form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (
            await act(company, {
              action: "decision",
              disposition,
              rationale,
              objections,
              trigger,
              memo_version: memoVersion || null,
            })
          )
            onClose();
        }}
      >
        <label>
          Disposition
          <select
            aria-label="Disposition"
            value={disposition}
            onChange={(e) => setDisposition(e.target.value as Disposition)}
          >
            {[
              "Pass",
              "Watch",
              "Progress to diligence",
              "Progress to partner",
              "Invest",
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          Why this decision?
          <textarea
            aria-label="Why this decision?"
            required
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            placeholder="Explain which evidence matters and what remains uncertain."
          />
        </label>
        {!!company.memos.length && (
          <label>
            Memo considered
            <select
              aria-label="Memo considered"
              value={memoVersion}
              onChange={(e) => setMemoVersion(Number(e.target.value))}
            >
              <option value={0}>No memo used for this decision</option>
              {company.memos.map((m) => (
                <option key={m.version} value={m.version}>
                  Memo v{m.version} ·{" "}
                  {m.model_version
                    ? `model v${m.model_version}`
                    : "evidence-only Pass"}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Counter-case or dissent
          <textarea
            aria-label="Counter-case or dissent"
            value={objections}
            onChange={(e) => setObjections(e.target.value)}
            placeholder="What would a skeptical partner challenge?"
          />
        </label>
        <label>
          What would change your mind?
          <textarea
            aria-label="What would change your mind?"
            required
            value={trigger}
            onChange={(e) => setTrigger(e.target.value)}
          />
        </label>
        <div className="notice">
          Saved by {company.owner}.
          {company.illustrative
            ? " This is an illustrative investment scenario."
            : " Your rationale and current evidence revision are preserved."}
        </div>
        <button className="ws-button primary" disabled={busy}>
          {busy ? "Saving decision…" : "Save decision"}
          <Icon name="check" size={16} />
        </button>
      </form>
    </Drawer>
  );
}
function ReviewForm({
  company,
  claimId,
  onClose,
}: {
  company: Company;
  claimId: string;
  onClose: () => void;
}) {
  const { act, busy } = useWorkspace();
  const claim = company.claims.find((c) => c.id === claimId)!;
  const [state, setState] = useState<EvidenceState>(claim.state);
  const [rationale, setRationale] = useState("");
  const [statement, setStatement] = useState(claim.statement);
  const sourceIds = company.evidence
    .filter((e) => e.claim_id === claimId)
    .map((e) => e.source_id);
  return (
    <Drawer title="Review this claim" onClose={onClose}>
      <EvidenceChip state={claim.state} />
      <h3 className="drawer-claim">{claim.statement}</h3>
      {company.illustrative && (
        <div className="notice">
          Sources are fictional. Review states apply within this demonstration
          only.
        </div>
      )}
      {company.sources
        .filter((s) => sourceIds.includes(s.id))
        .map((s) => (
          <SourceCard key={s.id} source={s} />
        ))}
      {sourceIds.length === 0 && (
        <p className="notice">
          No evidence found. This claim cannot be marked verified.
        </p>
      )}
      <form
        className="workspace-form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (
            await act(company, {
              action: "review",
              claim_id: claimId,
              state,
              rationale,
              statement,
            })
          )
            onClose();
        }}
      >
        <label>
          Evidence state
          <select
            value={state}
            onChange={(e) => setState(e.target.value as EvidenceState)}
          >
            {states.map((s) => (
              <option
                disabled={s === "Verified" && sourceIds.length === 0}
                key={s}
              >
                {s}
              </option>
            ))}
          </select>
        </label>
        <label>
          Canonical claim statement
          <textarea
            required
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
          />
        </label>
        <label>
          Review rationale
          <textarea
            required={state === "Verified"}
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            placeholder="If sources conflict, explain the canonical value, period and method."
          />
        </label>
        <button className="ws-button primary" disabled={busy}>
          Save evidence review
          <Icon name="check" size={16} />
        </button>
      </form>
    </Drawer>
  );
}
function Assistant({
  company,
  page,
  initialRunId,
  onClose,
}: {
  company: Company;
  page: string;
  initialRunId?: string | null;
  onClose: () => void;
}) {
  const { data, act, busy } = useWorkspace();
  const canWrite=company.can_write!==false&&['analyst','partner','admin'].includes(data?.role??'');
  const [task, setTask] = useState("Challenge this claim");
  const [runId, setRunId] = useState(
    initialRunId ??
      company.ai_runs.find((r) => r.status === "Draft")?.id ??
      company.ai_runs.at(-1)?.id,
  );
  const run =
    company.ai_runs.find((r) => r.id === runId) ?? company.ai_runs.at(-1);
  return (
    <Drawer title="Research assistant" onClose={onClose} assistant>
      <div className="assistant-context">
        <Icon name="spark" />
        <div>
          <strong>
            {company.name} / {page}
          </strong>
          <span>
            {company.sources.length} scoped sources · {data?.provider.provider}
          </span>
        </div>
      </div>
      <p className="notice">
        {data?.provider.configured
          ? "A run sends this company's claims and source excerpts to the configured provider. Assumption tasks also send its underwriting inputs; change summaries send its recent review events and notes. Review the scope before running."
          : "A model provider is not connected. Drafts use transparent evidence rules and templates; no AI inference is simulated."}
      </p>
      <label className="assistant-task">
        Suggested action
        <select value={task} onChange={(e) => setTask(e.target.value)}>
          {[
            "Challenge this claim",
            "Find the weakest assumption",
            "Draft customer-reference questions",
            "Identify conflicting evidence",
            "Explain what changed",
          ].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </label>
      <section className="assistant-plan">
        <span className="eyebrow">PLAN BEFORE THE RUN</span>
        <ol>
          <li>
            Inspect {company.sources.length} sources for {company.name}.
          </li>
          <li>Compare claims and unresolved contradictions.</li>
          <li>Draft questions with source references.</li>
        </ol>
        <p className="muted">
          Model: {data?.provider.model}. Outputs remain separate until reviewed.
          Approved claims are never overwritten.
        </p>
        <button
          className="ws-button primary"
          disabled={busy||!canWrite}
          onClick={async () => {
            const updated = await act(company, { action: "draft", task });
            if (updated) setRunId(updated.ai_runs.at(-1)?.id);
          }}
        >
          <Icon name="spark" size={16} />
          {busy ? "Preparing cited draft…" : "Run draft"}
        </button>
      </section>
      {run && (
        <section className="assistant-output">
          <div className="section-heading">
            <EvidenceChip state="AI draft" />
            <span className="mini-label">{run.status}</span>
          </div>
          <h3>{run.task}</h3>
          <label className="assistant-task">
            Draft history
            <select value={run.id} onChange={(e) => setRunId(e.target.value)}>
              {company.ai_runs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.task} · {r.status} · {date(r.created_at)}
                </option>
              ))}
            </select>
          </label>
          <p className="muted">
            {run.provider} · {run.model} · {date(run.created_at)}
          </p>
          <div className="reason-tags">
            {run.source_ids.map((id) => (
              <span key={id}>{id}</span>
            ))}
          </div>
          <pre className="artifact-text">{run.draft}</pre>
          {run.status === "Draft" ? (
            <div className="button-row">
              <button
                className="ws-button primary"
                disabled={busy||!canWrite}
                onClick={() =>
                  void act(company, {
                    action: "review_draft",
                    run_id: run.id,
                    approved: true,
                  })
                }
              >
                Approve as note
              </button>
              <button
                className="ws-button secondary"
                disabled={busy||!canWrite}
                onClick={() =>
                  void act(company, {
                    action: "review_draft",
                    run_id: run.id,
                    approved: false,
                  })
                }
              >
                Reject draft
              </button>
            </div>
          ) : (
            <p className="inline-success">
              Reviewed by {run.reviewed_by}. The original claims were preserved.
            </p>
          )}
        </section>
      )}
    </Drawer>
  );
}
function Underwriting({ company }: { company: Company }) {
  const { act, busy, data, error } = useWorkspace();
  const canWrite = company?.can_write!==false && ["analyst", "partner", "admin"].includes(data?.role ?? "");
  const [editing, setEditing] = useState<string | null>(null);
  const [comparing, setComparing] = useState(false);
  const [calculation, setCalculation] = useState<CalculationSelection | null>(null);
  const [notes, setNotes] = useState<Record<string, AssumptionNote>>({});
  const [operatingVersion,setOperatingVersion]=useState<number|null>(null);
  const defaults = Object.fromEntries(
    company.assumptions.map((a) => [a.id, a.value]),
  ) as unknown as ModelInputs;
  const [inputs, setInputs] = useState<Record<keyof ModelInputs, number | "">>(defaults);
  const [rationale, setRationale] = useState(
    "Analyst base-case assumptions; customer expansion and exit multiple require validation.",
  );
  const [version, setVersion] = useState<number | null>(null);
  const model =
    version === null
      ? company.models.at(-1)
      : company.models.find((m) => m.version === version);
  return (
    <>
      <div className="notice mobile-model-note">
        Review the frozen model here. Use the desktop workspace to edit
        underwriting assumptions and create new scenarios.
      </div>
      <div className="section-heading">
        <div>
          <h2>Financial model</h2>
          <p className="muted">
            USD equity scenarios · saved assumptions and calculated returns
          </p>
        </div>
        {company.models.length > 0 && (
          <label className="inline-label">
            Frozen version
            <select
              value={version ?? company.models.length}
              onChange={(e) => setVersion(Number(e.target.value))}
            >
              {company.models.map((m) => (
                <option key={m.version} value={m.version}>
                  Version {m.version}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="model-layout">
        <form
          className="work-card assumption-panel"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await act(company, { action: "model", inputs, rationale, assumption_notes: notes, operating_version:operatingVersion }))
              setVersion(null);
          }}
        >
          <div className="card-heading">
            <h3>Operating & investment assumptions</h3>
            <span className="mini-label">EDITABLE INPUTS</span>
          </div>
          {company.assumptions.map((a: Assumption) => (
            <div className="assumption-input" key={a.id}>
              <div className="assumption-description"><label htmlFor={`assumption-${a.id}`}>
                <strong>{a.id==='arr'?`Year ${inputs.years||'?'} ARR`:a.label}</strong>
                <small>
                  {(notes[a.id] ? notes[a.id].source_id : a.source_id) ?? "Analyst assumption"} · {a.owner}
                  <br />
                  {notes[a.id]?.rationale ?? a.rationale}
                  <br />
                  Modified {date(a.modified_at)}
                </small></label>
                <button type="button" className="text-link" disabled={!canWrite} onClick={() => setEditing(a.id)} aria-label={`Edit rationale for ${a.label}`}>Explain this assumption<Icon size={12}/></button>
              </div>
              <span className="number-input">
                <input
                  id={`assumption-${a.id}`}
                  aria-label={a.id==='arr'?`Year ${inputs.years||'?'} ARR`:a.label}
                  disabled={!canWrite}
                  type="number"
                  step={a.id === "years" ? "1" : a.id === "dilution" ? ".01" : "any"}
                  min={a.id === "years" ? 1 : a.id === "dilution" || a.id === "follow_on" ? 0 : 0.01}
                  max={a.id === "years" ? 20 : a.id === "dilution" ? 0.99 : a.id === "multiple" ? 100 : 1e12}
                  required
                  value={inputs[a.id as keyof ModelInputs] ?? ""}
                  onChange={(e) => {
                    if(a.id==='arr'||a.id==='years')setOperatingVersion(null);
                    setInputs({ ...inputs, [a.id]: e.target.value === "" ? "" : Number(e.target.value) });
                    setNotes(current => current[a.id] ? { ...current, [a.id]: { ...current[a.id], source_id: null } } : current);
                  }}
                />
                <span>{a.unit}</span>
              </span>
            </div>
          ))}
          <label className="rationale-input">
            Rationale for this version
            <textarea
              required
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
            />
          </label>
          {error && <p className="notice error" role="alert">{error}</p>}
          <button className="ws-button primary" disabled={busy || !canWrite}>
            {busy ? "Calculating…" : "Calculate & freeze version"}
            <Icon name="check" size={16} />
          </button>
          {operatingVersion&&<p className="notice">Terminal ARR and holding period linked to operating forecast v{operatingVersion}. Changing either input removes the link.</p>}
        </form>
        <section className="work-card model-results">
          <div className="card-heading">
            <h3>Return scenarios</h3>
            {model && (
              <span className="mini-label">FROZEN V{model.version}</span>
            )}
          </div>
          {model ? (
            <>
              <button type="button" className="model-base" onClick={() => setCalculation({ scenario: "Base" })} aria-label="Inspect Base calculation">
                <span>BASE CASE MOIC</span>
                <strong>
                  {model.scenarios.Base.moic.toFixed(2)}
                  <small>x</small>
                </strong>
                <p>
                  {(model.scenarios.Base.irr * 100).toFixed(1)}% annual IRR ·{" "}
                  {model.inputs.years}-year hold
                </p>
                <span className="calculation-link">See the calculation <Icon size={14}/></span>
              </button>
              <div className="table-scroll">
                <table className="research-table scenario-table">
                  <thead>
                    <tr>
                      <th>Scenario</th>
                      <th>MOIC</th>
                      <th>IRR</th>
                      <th>Exit value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(model.scenarios).map(([name, r]) => (
                      <tr key={name}>
                        <td>{name}</td>
                        <td><button className="model-value-button" onClick={() => setCalculation({ scenario: name })} aria-label={`Inspect ${name} MOIC calculation`}>{r.moic.toFixed(2)}x</button></td>
                        <td><button className="model-value-button" onClick={() => setCalculation({ scenario: name })} aria-label={`Inspect ${name} IRR calculation`}>{(r.irr * 100).toFixed(1)}%</button></td>
                        <td><button className="model-value-button" onClick={() => setCalculation({ scenario: name })} aria-label={`Inspect ${name} exit value calculation`}>{money(r.exit_value)}</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <dl className="detail-list">
                <div>
                  <dt>Initial ownership</dt>
                  <dd>
                    <button className="model-value-button" onClick={() => setCalculation({ scenario: "Base" })} aria-label="Inspect initial ownership calculation">{(model.scenarios.Base.initial_ownership * 100).toFixed(2)}%</button>
                  </dd>
                </div>
                <div>
                  <dt>Exit ownership</dt>
                  <dd>
                    <button className="model-value-button" onClick={() => setCalculation({ scenario: "Base" })} aria-label="Inspect exit ownership calculation">{(model.scenarios.Base.exit_ownership * 100).toFixed(2)}%</button>
                  </dd>
                </div>
                <div>
                  <dt>Total invested</dt>
                  <dd><button className="model-value-button" onClick={() => setCalculation({ scenario: "Base" })} aria-label="Inspect total invested calculation">{money(model.scenarios.Base.invested)}</button></dd>
                </div>
              </dl>
              <h3 className="sensitivity-heading">MOIC sensitivity</h3>
              <p className="muted">
                Rows: ARR at 0.5× / 1× / 1.5×. Columns: multiple at 0.7× / 1× /
                1.3×.
              </p>
              <div className="sensitivity-grid">
                {model.sensitivity.flatMap((row, i) =>
                  row.map((value, j) => (
                    <button
                      className={i === 1 && j === 1 ? "base" : ""}
                      key={`${i}-${j}`}
                      onClick={() => setCalculation({ row: i, column: j })}
                      aria-label={`Inspect sensitivity with ARR at ${[.5,1,1.5][i]} times base and multiple at ${[.7,1,1.3][j]} times base`}
                    >
                      {value.toFixed(2)}x
                    </button>
                  )),
                )}
              </div>
              <p className="model-method">{model.method}</p>
              <div className="model-review-actions" role="group" aria-label="Frozen model actions"><button
                className="ws-button secondary"
                onClick={() =>
                  downloadText(
                    `${company.id}-model-v${model.version}.json`,
                    JSON.stringify(model, null, 2),
                  )
                }
              >
                <Icon name="download" size={16} />
                Export model JSON
              </button>
              {company.models.length > 1 && <button className="ws-button secondary model-compare-button" onClick={() => setComparing(true)}>Compare versions<Icon size={16}/></button>}
              <ArtifactDownload company={company} format="xlsx" modelVersion={model.version} label="Download Excel model"/>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <Icon name="source" />
              <h3>Start with visible assumptions</h3>
              <p>
                Calculate and freeze the first version to inspect the scenarios
                and sensitivity table.
              </p>
            </div>
          )}
        </section>
      </div>
      {editing && <AssumptionEditor key={editing} company={company} id={editing} note={notes[editing]} onClose={() => setEditing(null)} onSave={note => { setNotes(current => ({ ...current, [editing]: note })); setEditing(null); }}/>}
      <OperatingForecast company={company} onUse={p=>{
        setInputs(current=>({...current,arr:p.rows.at(-1)!.arr,years:p.rows.length}));setOperatingVersion(p.version);
        setNotes(current=>({...current,arr:{source_id:p.source_ids[0],rationale:`Operating forecast v${p.version}: ${p.rationale}`}}));
      }}/>
      {model?.operating_projection&&<p className="notice">Frozen return model v{model.version} uses operating forecast v{model.operating_projection.version} · {model.operating_projection.name}. The forecast remains an assumption, not verified financial performance.</p>}
      {comparing && model && <ModelComparison company={company} selectedVersion={model.version} onClose={() => setComparing(false)}/>}
      {calculation && model && <ModelCalculation model={model} selection={calculation} onClose={() => setCalculation(null)}/>}
    </>
  );
}
export default function CompanyWorkspace() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const search = useSearchParams();
  const { data, act, busy } = useWorkspace();
  const { token } = useAuth();
  const tab = tabs.includes(search.get("tab") ?? "")
    ? search.get("tab")!
    : "Overview";
  const company = data?.companies.find((c) => c.id === params.id);
  const [drawer, setDrawer] = useState<{
    kind: "sources" | "score" | "decision" | "assistant" | "review" | "capture" | "presentation" | "memo-edit";
    claimId?: string;
  } | null>(null);
  const [history, setHistory] = useState<Audit[]>([]);
  const [historyError, setHistoryError] = useState("");
  const [note, setNote] = useState("");
  const [noteKind, setNoteKind] = useState("Analyst note");
  const [noteAt, setNoteAt] = useState("");
  const [memoVersion, setMemoVersion] = useState<number | null>(null);
  const [comparisonDecision,setComparisonDecision]=useState<string|null>(null);
  useLayoutEffect(() => {
    function navigate(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (!company || event.ctrlKey || event.metaKey || event.altKey || target.matches("input,textarea,select,[contenteditable]") || document.querySelector('[role="dialog"],dialog[open]')) return;
      if (event.key.toLowerCase() === "e") { event.preventDefault(); setDrawer({kind:"sources"}); }
      if (event.key.toLowerCase() === "m") { event.preventDefault(); router.push(`/companies/${company.id}?tab=Memo`); }
    }
    document.addEventListener("keydown", navigate);
    return () => document.removeEventListener("keydown", navigate);
  }, [company, router]);
  useEffect(() => {
    if (!token || !company) return;
    const controller = new AbortController();
    workspaceFetch<Audit[]>(`/companies/${company.id}/history`, token, {
      signal: controller.signal,
    })
      .then(setHistory)
      .catch((e) => {
        if (!controller.signal.aborted)
          setHistoryError(
            e instanceof Error ? e.message : "History unavailable",
          );
      });
    return () => controller.abort();
  }, [token, company]);
  if (!data) return null;
  if (!company)
    return (
      <div className="page-content empty-state">
        <h1>Company not found</h1>
        <p>This record is unavailable in your workspace.</p>
        <Link className="ws-button secondary" href="/discover">
          Return to discovery
        </Link>
      </div>
    );
  const c = company;
  const verified = c.claims.filter((q) => q.state === "Verified").length;
  const founderClaim = c.claims.find(
    (q) => q.topic === "founder" || (c.illustrative && q.id === "C01"),
  );
  const canWrite = c.can_write!==false && ["analyst", "partner", "admin"].includes(data.role);
  const latestActivity = [c.signal_at, ...c.sources.map(s => s.captured_at), ...c.reviews.map(r => r.at), ...c.decisions.map(d => d.at), ...c.interactions.map(i => i.at), ...c.models.map(m => m.at), ...c.memos.map(m => m.at), ...c.diligence_tasks.map(t => t.updated_at)].filter(Boolean).sort().at(-1);
  const memo =
    memoVersion === null
      ? c.memos.find(m => m.version === Number(search.get("memo"))) ?? c.memos.at(-1)
      : c.memos.find((m) => m.version === memoVersion);
  return (
    <div className="page-content company-page">
      {c.fund_record&&<div className="notice">Fund-owned research · {canWrite?'You can review this record.':'You have read-only access.'} The personal original and private files remain separate.</div>}
      <div className="company-back">
        <Link href="/pipeline">← Pipeline</Link>
        <span className="mini-label">
          {c.illustrative ? "ILLUSTRATIVE COMPANY" : "MANUAL RESEARCH"} /
          REVISION {c.revision}
        </span>
      </div>
      <header className="company-heading">
        <Avatar name={c.name} large />
        <div>
          <h1>
            {c.name}
            <span className="decision-pill">{c.disposition}</span>
          </h1>
          <p>
            {c.stage} <span>·</span> {c.geography} <span>·</span> {c.sector}{" "}
            <span>·</span> Owner: {c.owner}
          </p>
          <small>
            Evidence review: {verified}/{c.claims.length} claims verified ·
            Founder identity: {founderClaim?.state ?? "Not reviewed"}{latestActivity && ` · Latest recorded activity: ${date(latestActivity)}`}
          </small>
        </div>
        <button
          className="ws-button secondary assistant-button"
          onClick={() => setDrawer({ kind: "assistant" })}
        >
          <Icon name="spark" size={16} />
          Research assistant
        </button>
      </header>
      <div className="company-decision-bar">
        <Icon name="arrow" size={16} />
        <span>
          <strong>Next action</strong>
          {c.next_action}
        </span>
        <button
          className="text-link"
          onClick={() => setDrawer({ kind: "decision" })}
          disabled={!canWrite}
        >
          Record decision
          <Icon size={14} />
        </button>
      </div>
      <nav className="company-tabs" aria-label="Company sections">
        {tabs.map((t) => (
          <Link
            href={`/companies/${c.id}?tab=${t}`}
            aria-current={tab === t ? "page" : undefined}
            className={tab === t ? "active" : ""}
            key={t}
          >
            {t}
            {t === "Evidence" && <span>{c.sources.length}</span>}
          </Link>
        ))}
      </nav>
      <ResearchOrientation tab={tab} />
      <details className="optional-tools company-tool-menu" key={c.id}><summary>More tools<span>Review meeting, presentation and memo</span></summary><div className="company-studio-bar"><div><Link href={`/companies/${c.id}?tab=Overview#review-agenda`} className="text-link"><Icon name="today" size={15}/>Plan a review</Link><button className="text-link" disabled={!memo} onClick={() => setDrawer({kind:"presentation"})}><Icon name="library" size={15}/>Prepare presentation</button><Link href={`/companies/${c.id}?tab=Memo`} className="text-link">{c.memos.length ? `${c.memos.length} memo versions` : "Build the memo"}<Icon size={14}/></Link></div></div></details>
      {tab === "Overview" && (
        <>
          <div className="company-overview-grid">
            <section className="work-card investment-snapshot">
              <span className="eyebrow">INVESTMENT SNAPSHOT</span>
              <h2>Company summary</h2>
              <p className="document-lede">
                {c.description ||
                  "Begin with a primary source. Build the company story from reviewed claims."}
              </p>
              <div className="snapshot-metrics">
                <button
                  className="snapshot-score"
                  onClick={() => setDrawer({ kind: "score" })}
                  aria-label="Inspect thesis fit score"
                >
                  <span>THESIS FIT ↗</span>
                  <strong>
                    {c.fit_score ?? "—"}
                    <small>
                      {c.fit_score === null ? "not scored" : "/100"}
                    </small>
                  </strong>
                </button>
                <Link
                  className="snapshot-drill"
                  href={`/companies/${c.id}?tab=Evidence`}
                  aria-label="Inspect verified claims"
                >
                  <span>VERIFIED CLAIMS</span>
                  <strong>
                    {verified}
                    <small>/{c.claims.length}</small>
                  </strong>
                </Link>
                <Link
                  className="snapshot-drill"
                  href={`/companies/${c.id}?tab=Diligence`}
                  aria-label="Inspect recorded risks"
                >
                  <span>OPEN RISKS</span>
                  <strong>
                    {c.risks.length ? c.risks.filter(r=>r.status!=="Mitigated").length : "—"}
                    <small>
                      {c.risks.length ? "open" : "not assessed"}
                    </small>
                  </strong>
                </Link>
                <Link
                  className="snapshot-drill"
                  href={`/companies/${c.id}?tab=Model`}
                  aria-label="Inspect frozen return model"
                >
                  <span>BASE MOIC</span>
                  <strong>
                    {c.models.at(-1)?.scenarios.Base.moic.toFixed(1) ?? "—"}
                    <small>{c.models.length ? "x" : "unmodeled"}</small>
                  </strong>
                </Link>
              </div>
              <div className="investment-story">
                <div>
                  <span>WHY NOW</span>
                  <p>
                    {c.why_now || "No why-now thesis recorded."}
                    <small>Analyst hypothesis · needs validation</small>
                  </p>
                </div>
                <div>
                  <span>WHAT MUST BE TRUE</span>
                  <p>
                    {c.claims.find((q) => q.state !== "Verified")?.question ||
                      "Define the critical claim and capture the evidence that would test it."}
                  </p>
                </div>
                <div>
                  <span>WHAT BREAKS</span>
                  <p>
                    {c.risks.find(r=>r.status!=="Mitigated")?.question ||
                      "No failure condition recorded. Diligence coverage needs review."}
                  </p>
                </div>
              </div>
              <div className="button-row">
                <button
                  className="ws-button primary"
                  disabled={busy||!canWrite}
                  onClick={() => void act(c, { action: "screen" })}
                >
                  {busy
                    ? "Preparing…"
                    : c.screening
                      ? "Refresh screening brief"
                      : "Generate cited screen"}
                  <Icon name="source" size={16} />
                </button>
                <button
                  className="ws-button secondary"
                  onClick={() => setDrawer({ kind: "decision" })}
                  disabled={!canWrite}
                >
                  Choose disposition
                </button>
                {!c.in_pipeline && (
                  <button
                    className="ws-button secondary"
                    disabled={busy||!canWrite}
                    onClick={() => void act(c, { action: "pipeline" })}
                  >
                    Add to pipeline
                  </button>
                )}
              </div>
            </section>
            <aside>
              <section className="work-card evidence-health">
                <h3>Evidence health</h3>
                <Health company={c} />
                <button
                  className="text-link"
                  onClick={() => setDrawer({ kind: "sources" })}
                >
                  Inspect the source set
                  <Icon size={14} />
                </button>
              </section>
              <section className="work-card founder-summary">
                <span className="eyebrow">THE PERSON BEHIND THE COMPANY</span>
                <h3>{c.people[0].name}</h3>
                <p>
                  {c.people[0].role}
                  <br />
                  Previously {c.people[0].previous_employer}
                </p>
                <EvidenceChip state={founderClaim?.state ?? "Missing"} />
                <p className="muted">
                  {founderClaim
                    ? "Inspect the founder claim in Evidence for its sources and review history."
                    : "User-entered identity. No supporting founder claim captured."}
                </p>
              </section>
            </aside>
          </div>
          {c.screening && (
            <section className="work-card screening-document">
              <div className="card-heading">
                <h2>Screening brief</h2>
                <button
                  className="ws-button secondary"
                  onClick={() =>
                    downloadText(`${c.id}-screen.txt`, c.screening!)
                  }
                >
                  <Icon name="download" size={14} />
                  Export brief
                </button>
              </div>
              <pre className="artifact-text">{c.screening}</pre>
              <p className="muted">
                Screen snapshot · {date(c.screening_created_at || c.signal_at)}.
                Current disposition: {c.disposition}. Refresh the brief to
                include subsequent decisions or evidence edits.
              </p>
              <button
                className="ws-button primary"
                onClick={() => setDrawer({ kind: "decision" })}
                disabled={!canWrite}
              >
                Record the screening decision
                <Icon />
              </button>
            </section>
          )}
          <section className="work-card decision-history">
            <div className="card-heading">
              <h2>Decision & activity history</h2>
              <span className="mini-label">REASONING PRESERVED</span>
            </div>
            {c.decisions.length === 0 && (
              <p className="muted">
                No formal decision recorded. Save a disposition with a rationale
                and revisit condition.
              </p>
            )}
            {c.decisions
              .slice()
              .reverse()
              .map((d) => (
                <article className="timeline-item" key={d.id}>
                  <span className="timeline-dot" />
                  <div>
                    <h3>{d.disposition}</h3>
                    <p>{d.rationale}</p>
                    <small>
                      {d.author} · {date(d.at)} · Model{" "}
                      {d.model_version ? `v${d.model_version}` : "not frozen"}
                      {d.memo_version ? ` · Memo v${d.memo_version}` : ""}
                      {d.evidence_revision
                        ? ` · Evidence revision ${d.evidence_revision}`
                        : ""}
                    </small>
                    <p className="muted">
                      Counter-case: {d.objections || "Not recorded"}
                      <br />
                      Revisit: {d.trigger}
                    </p>
                    <button className="source-link" onClick={()=>setComparisonDecision(d.id)}>What changed since this decision?</button>
                  </div>
                </article>
              ))}
            {historyError && <p className="notice error">{historyError}</p>}
            {history.slice(0, 5).map((h) => (
              <div className="audit-row" key={h.id}>
                <Icon name="clock" size={14} />
                <span>
                  {h.action.replace("_", " ")} · {h.actor}
                </span>
                <span className="mono">
                  v{h.previous_revision} → v{h.revision}
                </span>
                <small>{date(h.at)}</small>
              </div>
            ))}
            <form
              className="note-form"
              onSubmit={async (e) => {
                e.preventDefault();
                if (await act(c, { action: "note", rationale: note, note_kind: noteKind, note_at: noteAt ? new Date(noteAt).toISOString() : null })) {
                  setNote(""); setNoteAt("");
                }
              }}
            >
              <label htmlFor="activity-kind">Record activity</label><select id="activity-kind" value={noteKind} onChange={e => setNoteKind(e.target.value)}>{["Analyst note", "Founder response", "Outbound contact"].map(kind => <option key={kind}>{kind}</option>)}</select>
              <small className="muted">Enter a response only when you received one. Recording outbound contact does not send a message.</small>
              <label htmlFor="activity-time">When did it happen? <span className="muted">Optional · your local time</span></label>
              <input id="activity-time" type="datetime-local" value={noteAt} onChange={e=>setNoteAt(e.target.value)}/>
              <small className="muted">Leave blank to record now. Use the original date for earlier replies; the save time remains in record history.</small>
              <label htmlFor="company-note">Activity note</label>
              <textarea
                id="company-note"
                required
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Capture what changed your view…"
              />
              <button className="ws-button secondary" disabled={busy||!canWrite}>
                Save note
              </button>
            </form>
            {c.interactions
              .filter((i) => i.kind !== "Source capture")
              .slice()
              .reverse()
              .map((i) => (
                <article className="saved-note" key={i.id}>
                  <strong>
                    {i.kind} · {i.actor}
                  </strong>
                  <p>{i.note}</p>
                  <small>{date(i.at)}</small>
                </article>
              ))}
          </section>
        </>
      )}
      {tab === "Evidence" && (
        <>
          <div className="section-heading">
            <div>
              <h2>Evidence register</h2>
              <p className="muted">
                Every material claim has a state, sources, an owner and a next
                question.
              </p>
            </div>
            <div className="button-row">
              <button
                className="ws-button primary"
                disabled={busy || !canWrite}
                onClick={() => setDrawer({ kind: "capture" })}
              >
                <Icon name="plus" size={16} />
                Capture source
              </button>
              <button
                className="ws-button secondary"
                onClick={() => setDrawer({ kind: "sources" })}
              >
                <Icon name="source" size={16} />
                All sources
              </button>
            </div>
          </div>
          <section className="work-card claim-register">
            {c.claims.length === 0 && (
              <div className="empty-state">
                <Icon name="source" />
                <h3>No sources captured</h3>
                <p>
                  Capture an excerpt, link its claim, and record what still
                  needs verification. No revenue, valuation or score is assumed.
                </p>
              </div>
            )}
            {c.claims.map((claim) => (
              <article className="claim-row" key={claim.id}>
                <span className="source-id">{claim.id}</span>
                <div>
                  <h3>{claim.statement}</h3>
                  <p>{claim.question}</p>
                  <button
                    className="source-link"
                    onClick={() =>
                      setDrawer({ kind: "sources", claimId: claim.id })
                    }
                  >
                    <Icon name="source" size={14} />
                    {claim.evidence_ids.length
                      ? `${claim.evidence_ids.length} evidence links`
                      : "No evidence found"}{" "}
                    · {claim.owner}
                  </button>
                </div>
                <EvidenceChip state={claim.state} />
                <button
                  className="ws-button secondary"
                  onClick={() =>
                    setDrawer({ kind: "review", claimId: claim.id })
                  }
                  disabled={!canWrite}
                >
                  Review
                </button>
              </article>
            ))}
          </section>
          <div className="source-gallery">
            {c.sources.map((s) => (
              <SourceCard key={s.id} source={s} />
            ))}
          </div>
          <DecisionLoop company={c} section="evidence"/>
        </>
      )}
      {tab === "Diligence" && (
        <>
          <DiligencePlan
            key={search.get("work") ?? c.id}
            company={c}
            inspect={(claimId) => setDrawer({ kind: "sources", claimId })}
          />
          <div className="section-heading">
            <div>
              <h2>Diligence review</h2>
              <p className="muted">
                Material risks connect to claims, owners, due dates and
                questions that test the claims.
              </p>
            </div>
            <button
              className="ws-button secondary"
              onClick={() => setDrawer({ kind: "assistant" })}
            >
              <Icon name="spark" size={16} />
              Challenge the case
            </button>
          </div>
          <div className="diligence-grid">
            <section className="work-card evidence-map">
              <h3>Evidence graph</h3>
              <p className="muted">
                Inspectable source → evidence → claim relationships.
              </p>
              {c.claims.map((q) => (
                <button
                  className="graph-edge"
                  key={q.id}
                  onClick={() => setDrawer({ kind: "sources", claimId: q.id })}
                >
                  <span className="graph-source">
                    {c.evidence
                      .filter((e) => e.claim_id === q.id)
                      .map((e) => e.source_id)
                      .join(" + ") || "Missing source"}
                  </span>
                  <span className="graph-line" />
                  <span className="graph-claim">{q.id}</span>
                  <EvidenceChip state={q.state} />
                </button>
              ))}
            </section>
            <section className="work-card question-plan">
              <h3>Diligence questions</h3>
              {c.claims
                .filter((q) => q.state !== "Verified")
                .map((q, i) => (
                  <div key={q.id}>
                    <span className="mono">0{i + 1}</span>
                    <p>
                      {q.question}
                      <small>
                        {q.id} · {q.owner}
                      </small>
                    </p>
                  </div>
                ))}
            </section>
          </div>
          <RiskRegister key={`${c.id}:${search.get("risk") ?? ""}`} company={c} inspect={claimId => setDrawer({kind:"sources",claimId})}/>
          <DecisionLoop company={c} section="diligence"/>
        </>
      )}
      {tab === "Overview" && <div id="review-agenda"><ReviewAgenda company={c}/></div>}
      {tab === "Overview" && <DecisionLoop company={c} section="opportunities"/>}
      {comparisonDecision&&<DecisionChanges key={`${c.id}:${comparisonDecision}`} company={c} decisionId={comparisonDecision} close={()=>setComparisonDecision(null)}/>}
      {tab === "Model" && <Underwriting company={c} />}
      {tab === "Memo" && (
        <>
          <div className="section-heading">
            <div>
              <h2>Investment committee memo</h2>
              <p className="muted">
                Approved evidence, frozen assumptions, and a counter-case in one
                record.
              </p>
            </div>
            <button
              className="ws-button primary"
              disabled={
                busy || !canWrite ||
                (!c.models.length &&
                  !(c.disposition === "Pass" && c.decisions.length))
              }
              onClick={async () => {
                if (await act(c, { action: "memo" })) setMemoVersion(null);
              }}
            >
              Draft IC memo
              <Icon name="source" size={16} />
            </button>
          </div>
          {!c.models.length && (
            <div className="notice">
              {c.disposition === "Pass" && c.decisions.length ? (
                "This recorded Pass can be documented using public evidence alone. Financial inputs and return scenarios remain unmodeled."
              ) : (
                <>
                  Freeze a model before creating an investment memo. A recorded
                  Pass can use evidence alone.
                  <br />
                  <Link href={`/companies/${c.id}?tab=Model`}>
                    Open model →
                  </Link>
                </>
              )}
            </div>
          )}
          {memo ? (
            <section className="work-card memo-document">
              <div className="card-heading">
                <label className="inline-label">
                  Memo
                  <select
                    value={memo.version}
                    onChange={(e) => setMemoVersion(Number(e.target.value))}
                  >
                    {c.memos.map((m) => (
                      <option key={m.version} value={m.version}>
                        Version {m.version} ·{" "}
                        {m.model_version
                          ? `model v${m.model_version}`
                          : "evidence-only Pass"}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="ws-button secondary"
                  onClick={() =>
                    downloadText(`${c.id}-memo-v${memo.version}.txt`, memo.text)
                  }
                >
                  <Icon name="download" size={16} />
                  Export memo
                </button>
              </div>
              <MemoReader key={memo.version} memo={memo} />
              <div className="memo-studio-actions"><button className="ws-button secondary" disabled={!canWrite} onClick={() => setDrawer({kind:"memo-edit"})}>Write investment view<Icon name="source" size={16}/></button><button className="ws-button secondary" onClick={() => setDrawer({kind:"presentation"})}>Preview presentation<Icon size={16}/></button><ArtifactDownload company={c} format="pdf" memoVersion={memo.version} label="Download PDF memo"/>{memo.model_version && <ArtifactDownload company={c} format="xlsx" memoVersion={memo.version} label="Download linked Excel model"/>}</div>
              <div className="notice">
                Evidence frozen at company revision {memo.company_revision}.
                Prepared by {memo.owner}, {date(memo.at)}. Sources and approved
                claims are retained with this memo version.
              </div>
              <button
                className="ws-button secondary"
                onClick={() => setDrawer({ kind: "decision" })}
                disabled={!canWrite}
              >
                Record objections & decision
              </button>
            </section>
          ) : (
            <div className="work-card empty-state">
              <Icon name="library" />
              <h3>No IC memo drafted yet</h3>
              <p>
                {c.disposition === "Pass" && c.decisions.length
                  ? "Draft the Pass memo using reviewed evidence and the recorded rationale. Missing financial inputs stay missing."
                  : "Freeze the underwriting model, then draft a memo using approved evidence."}
              </p>
            </div>
          )}
          {memo && (
            <MemoReview key={memo.version} company={c} version={memo.version} />
          )}
          <ReviewPack company={c} memoVersion={memo?.version} />
        </>
      )}
      {drawer?.kind === "presentation" && memo && <PresentationStudio key={memo.version} company={c} memoVersion={memo.version} onClose={() => setDrawer(null)}/>}
      {drawer?.kind === "memo-edit" && memo && <MemoEditor key={memo.version} company={c} version={memo.version} onClose={() => setDrawer(null)} onSaved={version => { setMemoVersion(version); setDrawer(null); const next = new URLSearchParams(search.toString()); next.set("tab", "Memo"); next.set("memo", String(version)); router.replace(`/companies/${c.id}?${next.toString()}`); }}/>}
      {tab === "Monitor" && (
        <>
          <div className="section-heading">
            <div>
              <h2>Performance updates</h2>
              <p className="muted">
                Compare actuals with assumptions and investigate meaningful
                threshold changes.
              </p>
            </div>
            <EvidenceChip
              state={
                c.metrics.length === 0
                  ? "Missing"
                  : triggerFired(c)
                    ? "Conflicted"
                    : "Needs review"
              }
            />
          </div>
          <div className="monitor-metrics">
            {c.metrics.length === 0 && (
              <div className="work-card empty-state">
                <h3>No measured actuals yet</h3>
                <p>
                  Capture defined metrics and a reporting period before
                  monitoring performance.
                </p>
              </div>
            )}
            {c.metrics.map((m) => (
              <section className="work-card monitor-metric" key={m.id}>
                <span className="eyebrow">{m.label}</span>
                <strong className="mono">
                  {m.value}
                  {m.unit === "%" ? "%" : ` ${m.unit}`}
                </strong>
                <p>
                  {m.expected === null ? "No underwritten comparator" : <>Underwritten {m.expected}
                  {m.unit === "%" ? "%" : ` ${m.unit}`} · variance{" "}
                  {(m.value - m.expected).toFixed(0)} {m.unit}</>}
                </p>
                <EvidenceChip state={m.state} />
                <p className="muted">
                  {m.definition}
                  <br />
                  {m.period}
                </p>
                <button
                  className="source-link"
                  onClick={() => setDrawer({ kind: "sources" })}
                >
                  {m.source_id} · inspect update
                  <Icon size={14} />
                </button>
              </section>
            ))}
          </div>
          <section className="work-card monitoring-triggers">
            <h2>Revisit conditions</h2>
            {c.triggers.map((t) => (
              <article key={t.id}>
                <Icon name="alert" />
                <div>
                  <h3>{t.label}</h3>
                  <p>
                    Current:{" "}
                    {c.metrics.find((m) => m.id === t.metric_id)?.value} ·
                    Threshold: {t.operator} {t.threshold} · Owner: {t.owner}
                  </p>
                </div>
                <span className={`risk-severity ${triggerFired(c,t.id) ? "high" : "medium"}`}>
                  {!c.metrics.some(m=>m.id===t.metric_id) ? "Missing metric" : triggerFired(c,t.id) ? "Threshold crossed" : "Watching"}
                </span>
              </article>
            ))}
            <div className="notice">
              Alerts are calculated from saved{" "}
              {c.illustrative ? "illustrative " : ""}metrics when you open the
              workspace. No background monitoring connector is running.
            </div>
            <button
              className="ws-button secondary"
              onClick={() => setDrawer({ kind: "decision" })}
            >
              Reopen the decision
            </button>
          </section>
          <DecisionLoop company={c} section="monitor"/>
        </>
      )}
      <footer className="page-footnote">
        Open the sources before relying on a claim.{" "}
        <span>COMPANY / {c.id.toUpperCase()}</span>
      </footer>
      {drawer?.kind === "score" && (
        <EvidenceDrawer company={c} score onClose={() => setDrawer(null)} />
      )}
      {drawer?.kind === "capture" && (
        <SourceCaptureForm company={c} onClose={() => setDrawer(null)} />
      )}
      {drawer?.kind === "sources" && (
        <EvidenceDrawer
          company={c}
          claimId={drawer.claimId}
          onClose={() => setDrawer(null)}
        />
      )}
      {drawer?.kind === "decision" && (
        <DecisionForm company={c} onClose={() => setDrawer(null)} />
      )}
      {drawer?.kind === "review" && (
        <ReviewForm
          company={c}
          claimId={drawer.claimId!}
          onClose={() => setDrawer(null)}
        />
      )}
      {(drawer?.kind === "assistant" || search.get("draft")) && (
        <Assistant
          key={search.get("draft") ?? "assistant"}
          company={c}
          page={tab}
          initialRunId={search.get("draft")}
          onClose={() => {
            setDrawer(null);
            if (search.get("draft"))
              router.replace(`/companies/${c.id}?tab=${tab}`, {
                scroll: false,
              });
          }}
        />
      )}
    </div>
  );
}
