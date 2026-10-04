import type { Observation, DecisionCondition, AlertReview, Viewpoint, Opportunity, Affiliation } from './ecosystem';
export type EvidenceState =
  | "Unreviewed"
  | "Verified"
  | "Founder-reported"
  | "Calculated"
  | "AI-inferred"
  | "Missing"
  | "Conflicted";
export type Disposition =
  "Pass" | "Watch" | "Progress to diligence" | "Progress to partner" | "Invest";
export interface Source {
  id: string;
  title: string;
  url: string | null;
  file: string | null;
  captured_at: string;
  excerpt: string;
  method: string;
  illustrative: boolean;
  published_on?: string | null;
  observed_on?: string | null;
  origin_source_id?: string | null;
  rights?: string;
  rights_note?: string;
  availability?: string;
}
export interface Evidence {
  id: string;
  source_id: string;
  claim_id: string;
  confidence: number;
  reviewer: string | null;
  last_reviewed_at: string | null;
}
export interface Claim {
  id: string;
  statement: string;
  state: EvidenceState;
  evidence_ids: string[];
  owner: string;
  question: string;
  material: boolean;
  topic: "company" | "founder" | "traction" | "market" | "other";
  calculation: string | null;
}
export interface Assumption {
  id: string;
  label: string;
  value: number | null;
  unit: string;
  source_id: string | null;
  rationale: string;
  owner: string;
  modified_at: string;
}
export interface ModelInputs {
  pre_money: number;
  check: number;
  dilution: number;
  follow_on: number;
  follow_on_post_money: number;
  years: number;
  arr: number;
  multiple: number;
}
export interface Returns {
  initial_ownership: number;
  exit_ownership: number;
  exit_value: number;
  proceeds: number;
  invested: number;
  moic: number;
  irr: number;
}
export interface FrozenModel {
  operating_projection?: import('@/components/workspace/OperatingForecast').OperatingProjection;
  version: number;
  at: string;
  owner: string;
  inputs: ModelInputs;
  scenarios: Record<string, Returns>;
  sensitivity: number[][];
  assumptions: Assumption[];
  sources: Source[];
  method: string;
}
export interface AIRun {
  id: string;
  task: string;
  provider: string;
  model: string;
  source_ids: string[];
  steps: string[];
  draft: string;
  status: "Draft" | "Approved" | "Rejected";
  created_at: string;
  reviewed_by: string | null;
}
export interface DiligenceTask {
  decision_impact?:string;
  effort_hours?:number|null;
  changed_view?:'Not assessed'|'Strengthened'|'Weakened'|'Unchanged'|'Changed decision';
  impact_rationale?:string;
  id: string;
  claim_id: string;
  title: string;
  question: string;
  owner: string;
  due_date: string;
  priority: "High" | "Medium" | "Low";
  status: "Open" | "Blocked" | "Complete";
  outcome: string;
  source_ids: string[];
  updated_at: string;
  updated_by: string;
  completed_at: string | null;
  completed_by: string | null;
}
export interface RiskAssessment {
  id: string;
  title: string;
  severity: "High" | "Medium" | "Low";
  claim_id: string;
  question: string;
  owner: string;
  due_date: string;
  status?: "Open" | "Mitigated";
  rationale?: string;
  outcome?: string;
  source_ids?: string[];
  updated_at?: string | null;
  updated_by?: string | null;
}
export interface Company {
  operating_models?:import('@/components/workspace/OperatingForecast').OperatingProjection[];
  fund_record?:boolean;
  can_write?:boolean;
  observations?: Observation[];
  conditions?: DecisionCondition[];
  condition_states?: Record<string,string>;
  alert_reviews?: AlertReview[];
  viewpoints?: Viewpoint[];
  opportunities?: Opportunity[];
  meetings: ReviewMeeting[];
  research_hash?: string;
  diligence_tasks: DiligenceTask[];
  memo_comments: { id: string; memo_version: number; note: string; author: string; at: string }[];
  id: string;
  name: string;
  domain: string;
  sector: string;
  geography: string;
  stage: string;
  owner: string;
  description: string;
  why_now: string;
  next_action: string;
  disposition: Disposition | "Unreviewed";
  in_pipeline: boolean;
  watchlisted: boolean;
  portfolio: boolean;
  illustrative: boolean;
  signal_at: string;
  founder_signal: string;
  fit_score: number | null;
  fit_dimensions: Record<string, number>;
  reason_codes: string[];
  revision: number;
  people: {
    affiliations?: Affiliation[];
    id: string;
    name: string;
    role: string;
    previous_employer: string;
    profile_url: string | null;
    confidence: number;
  }[];
  sources: Source[];
  evidence: Evidence[];
  claims: Claim[];
  assumptions: Assumption[];
  decisions: {
    id: string;
    disposition: Disposition;
    rationale: string;
    objections: string;
    trigger: string;
    author: string;
    at: string;
    model_version: number | null;
    memo_version?: number | null;
    evidence_revision?: number | null;
  }[];
  metrics: {
    id: string;
    label: string;
    definition: string;
    period: string;
    value: number;
    expected: number | null;
    unit: string;
    state: EvidenceState;
    source_id: string;
  }[];
  triggers: {
    id: string;
    label: string;
    metric_id: string;
    operator: "lt" | "gt" | "lte" | "gte";
    threshold: number;
    owner: string;
  }[];
  risks: RiskAssessment[];
  interactions: {
    id: string;
    kind: string;
    note: string;
    actor: string;
    at: string;
  }[];
  reviews: {
    id: string;
    claim_id: string;
    previous: EvidenceState;
    current: EvidenceState;
    reviewer: string;
    at: string;
    rationale: string;
    previous_statement: string;
    current_statement: string;
  }[];
  ai_runs: AIRun[];
  screening: string | null;
  screening_created_at: string | null;
  models: FrozenModel[];
  memos: {
    version: number;
    at: string;
    owner: string;
    model_version: number | null;
    company_revision: number;
    research_hash?: string;
    diligence_tasks?: DiligenceTask[];
    text: string;
    parent_version?: number;
    reasoning?: { why_win: string; counter_case: string; reversal: string; source_ids: string[]; change_note: string };
    sources: Source[];
    claims: Claim[];
  }[];
}
export interface ReviewMeeting {
  id: string;
  title: string;
  kind: "Founder call" | "Customer reference" | "Partner review" | "Investment committee" | "Follow-up";
  starts_at: string;
  duration_minutes: number;
  location: string;
  agenda: string;
  claim_ids: string[];
  memo_version: number | null;
  status: "Planned" | "Complete" | "Cancelled";
  outcome: string;
  owner: string;
  updated_at: string;
  sequence: number;
}
export interface SearchFilters {
  query: string;
  geography: string;
  stage: string;
  sector: string;
  role: string;
  employer: string;
  signal: string;
  recency_days: number;
  min_evidence: number;
}
export interface WorkspaceData {
  quarantined_records?: { id: string; revision: number; fund_record: boolean; reason: string }[];
  actor_id?:string;
  companies: Company[];
  searches: { id: number; name: string; filters: SearchFilters }[];
  provider: {
    configured: boolean;
    provider: string;
    model: string;
    external_access: boolean;
  };
  role: string;
}
export interface Audit {
  id: number;
  actor: string;
  action: string;
  at: string;
  previous_revision: number;
  revision: number;
}
export const defaultFilters: SearchFilters = {
  query: "India B2B SaaS founders with prior MBB experience",
  geography: "India",
  stage: "All",
  sector: "All",
  role: "All",
  employer: "All",
  signal: "All",
  recency_days: 90,
  min_evidence: 2,
};
export const money = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(n);
export const date = (s: string) =>
  new Date(s).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
export const initials = (s: string) =>
  s
    .split(/(?=[A-Z])/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2);
export function thresholdCrossed(value:number|undefined,operator:string,threshold:number) {
  if(value===undefined)return false;
  return operator==='lt'?value<threshold:operator==='gt'?value>threshold:operator==='lte'?value<=threshold:value>=threshold;
}
export function triggerFired(c: Company, triggerId?:string) {
  return c.triggers.filter(t=>!triggerId||t.id===triggerId).some((t) => {
    const value = c.metrics.find((m) => m.id === t.metric_id)?.value;
    if (value === undefined) return false;
    return thresholdCrossed(value,t.operator,t.threshold);
  });
}
export type ReviewCategory =
  | "Evidence conflict"
  | "Screening ready"
  | "Portfolio alert"
  | "AI draft"
  | "Diligence due"
  | "Risk review"
  | "Decision review"
  | "Founder signal";
export interface ReviewItem {
  id: string;
  company: Company;
  type: ReviewCategory;
  title: string;
  state: "Conflicted" | "AI draft" | "Needs review";
  href: string;
  at: string | null;
  owner?: string;
  detail?: string;
}
export function calendarDate(at = Date.now()) {
  const value = new Date(at);
  return `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,"0")}-${String(value.getDate()).padStart(2,"0")}`;
}
// A company may have several independent review obligations. Never let one hide another.
export function reviewQueue(
  companies: Company[],
  at = Date.now(),
): ReviewItem[] {
  return companies.flatMap((c) => {
    const items: ReviewItem[] = [];
    const base = `/companies/${c.id}`;
    const today = calendarDate(at);
    for(const condition of c.conditions??[]) {
      const state=c.condition_states?.[condition.id];
      if(condition.status!=='Active'||(state!=='Review required'&&condition.due_date>today))continue;
      if(state==='Reviewed observation'&&condition.due_date>today)continue;
      items.push({id:`${c.id}:condition:${condition.id}`,company:c,type:'Decision review',title:state==='Review required'?`Changed observation: ${condition.title}`:`Review due: ${condition.title}`,state:'Needs review',href:`${base}?tab=Monitor&condition=${encodeURIComponent(condition.id)}`,at:condition.due_date,owner:condition.owner,detail:condition.rationale});
    }
    for (const risk of c.risks ?? []) {
      if (risk.status === "Mitigated" || risk.due_date > today) continue;
      items.push({id:`${c.id}:risk:${risk.id}`,company:c,type:"Risk review",title:`${risk.due_date < today ? "Overdue" : "Due today"}: ${risk.title}`,state:"Needs review",href:`${base}?tab=Diligence&risk=${encodeURIComponent(risk.id)}`,at:risk.due_date,owner:risk.owner,detail:risk.question});
    }
    for (const task of c.diligence_tasks ?? []) {
      if (task.status === "Complete" || task.due_date > today) continue;
      items.push({ id: `${c.id}:task:${task.id}`, company:c, type:"Diligence due", title:`${task.status === "Blocked" ? "Blocked" : task.due_date < today ? "Overdue" : "Due today"}: ${task.title}`, state:"Needs review", href:`${base}?tab=Diligence&work=${encodeURIComponent(task.id)}`, at:task.due_date, owner:task.owner,detail:task.question });
    }
    for (const run of c.ai_runs.filter((r) => r.status === "Draft")) {
      items.push({
        id: `${c.id}:draft:${run.id}`,
        company: c,
        type: "AI draft",
        title: `${run.task} · draft awaiting your review`,
        state: "AI draft",
        href: `${base}?tab=Diligence&draft=${encodeURIComponent(run.id)}`,
        at: run.created_at,
      });
    }
    if (c.portfolio && triggerFired(c)) {
      items.push({
        id: `${c.id}:portfolio`,
        company: c,
        type: "Portfolio alert",
        title: "A monitoring threshold has been crossed",
        state: "Needs review",
        href: `${base}?tab=Monitor`,
        at: null,
      });
    }
    const conflicts = c.claims.filter((q) => q.state === "Conflicted");
    if (conflicts.length) {
      items.push({
        id: `${c.id}:conflicts`,
        company: c,
        type: "Evidence conflict",
        title: `Compare ${conflicts.length} conflicting ${conflicts.length === 1 ? "claim" : "claims"}`,
        state: "Conflicted",
        href: `${base}?tab=Evidence`,
        at: null,
      });
    }
    const lastDecision = c.decisions.at(-1);
    if (
      c.screening &&
      (!lastDecision ||
        (c.screening_created_at &&
          Date.parse(c.screening_created_at) > Date.parse(lastDecision.at)))
    ) {
      items.push({
        id: `${c.id}:screen`,
        company: c,
        type: "Screening ready",
        title: "Review the screening brief and record your next step",
        state: "Needs review",
        href: `${base}?tab=Overview`,
        at: c.screening_created_at,
      });
    }
    const signalAge = at - Date.parse(c.signal_at);
    if (
      !c.in_pipeline &&
      !c.watchlisted &&
      !lastDecision &&
      signalAge >= 0 &&
      signalAge <= 30 * 86400000
    ) {
      items.push({
        id: `${c.id}:signal`,
        company: c,
        type: "Founder signal",
        title:
          c.founder_signal === "Manual intake"
            ? "Check the first sources for this company"
            : "Review the recent founder signal",
        state: "Needs review",
        href: `${base}?tab=Overview`,
        at: c.signal_at,
      });
    }
    return items;
  });
}
export function responseErrorMessage(data: unknown, fallback = "Please check the input fields and retry."): string {
  const detail = data && typeof data === "object" && "detail" in data ? (data as { detail: unknown }).detail : undefined;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((item: { msg?: string; loc?: (string | number)[] }) => {
    const field = item.loc?.filter(part => !["body", "query", "inputs", "assumption_notes"].includes(String(part))).join(" / ").replaceAll("_", " ");
    return `${field ? field + ": " : ""}${item.msg ?? "Invalid input"}`;
  }).join(". ");
  return fallback;
}

export async function workspaceFetch<T>(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (options.body) headers.set("Content-Type", "application/json");
  const response = await fetch(`/api/workspace${path}`, {
    ...options,
    headers,
    signal: options.signal ?? AbortSignal.timeout(55000),
  }).catch((error: unknown) => {
    if (error instanceof DOMException && error.name === "TimeoutError") throw new Error("This request took too long. Please try again.");
    if (error instanceof TypeError) throw new Error("Cannot reach the workspace. Check your connection and try again.");
    throw error;
  });
  if (!response.ok) {
    const data = await response
      .json()
      .catch(() => ({ detail: "Workspace is unavailable. Please retry." }));
    throw new Error(responseErrorMessage(data));
  }
  return response.json();
}
