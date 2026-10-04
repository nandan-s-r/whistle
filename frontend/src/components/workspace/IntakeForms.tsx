"use client";
import Link from "next/link";
import { useState } from "react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { Company, EvidenceState } from "@/lib/workspace";
import { Drawer, Icon } from "./Primitives";

export function CompanyIntakeForm({
  onClose,
  onCreated,
  addToPipeline = false,
}: {
  onClose: () => void;
  onCreated: (company: Company) => void;
  addToPipeline?: boolean;
}) {
  const { createCompany, act, busy, data } = useWorkspace();
  const [submitting, setSubmitting] = useState(false);
  const [pendingCompany, setPendingCompany] = useState<Company | null>(null);
  const [values, setValues] = useState({
    name: "",
    domain: "",
    geography: addToPipeline ? "Not evidenced" : "India",
    sector: addToPipeline ? "Not evidenced" : "B2B SaaS",
    stage: "Not evidenced",
    founder_name: "",
    founder_role: addToPipeline ? "Not evidenced" : "Founder",
    previous_employer: "",
    profile_url: "",
    description: "",
    why_now: "",
    illustrative: false,
  });
  const canWrite = ["analyst", "partner", "admin"].includes(data?.role ?? "");
  return (
    <Drawer title={addToPipeline ? "Add a company to Pipeline" : "Capture a company"} onClose={onClose}>
      <p className="muted">
        {addToPipeline ? "Start with the company and a person to research. You can add sources and other details afterward." : "Add a company to your research. Enter the identity you want to research, then capture the sources behind its claims."}
      </p>
      <div className="notice">
        {addToPipeline
          ? "These details still need source review. Adding a website does not import its contents. If the website is already saved, we use its existing company record."
          : "Metadata is user-entered. Capture does not verify identity, fetch a website, or assign an investment score. An existing company domain opens its current record."}
      </div>
      {!canWrite && (
        <div className="notice error" role="alert">
          Your role can review records but cannot create companies.
        </div>
      )}
      {pendingCompany && !submitting && <div className="notice" role="status">{pendingCompany.name} is saved. Retry adding it to Pipeline, or <Link href={`/companies/${pendingCompany.id}?tab=Evidence`} onClick={onClose}>open its research record</Link>.</div>}
      <form
        className="workspace-form"
        onInvalidCapture={(event) => {
          const details = (event.target as HTMLElement).closest("details");
          if (details) details.open = true;
        }}
        onSubmit={async (e) => {
          e.preventDefault();
          if (submitting || busy) return;
          setSubmitting(true);
          try {
            const company = pendingCompany
              ? data?.companies.find(company => company.id === pendingCompany.id) ?? pendingCompany
              : await createCompany({
                ...values,
                profile_url: values.profile_url || null,
                previous_employer: values.previous_employer || "Not evidenced",
              });
            if (!company) return;
            if (addToPipeline && !company.in_pipeline) {
              setPendingCompany(company);
              const updated = await act(company, { action: "pipeline" });
              if (updated) onCreated(updated);
            } else onCreated(company);
          } finally { setSubmitting(false); }
        }}
      >
        <fieldset className="company-intake-fields" disabled={submitting || busy || !!pendingCompany}>
        <legend className="sr-only">Company details</legend>
        <label>
          Company name
          <input
            required
            maxLength={160}
            value={values.name}
            onChange={(e) => setValues({ ...values, name: e.target.value })}
          />
        </label>
        <label>
          Company website or domain
          <input
            required
            placeholder="company.com"
            value={values.domain}
            onChange={(e) => setValues({ ...values, domain: e.target.value })}
          />
          <small>Used to detect duplicates within your workspace.</small>
        </label>
        <label>
          Founder or person to research
          <input required value={values.founder_name} onChange={(e) => setValues({ ...values, founder_name: e.target.value })}/>
          {addToPipeline && <small>A founder or contact whose identity you will check.</small>}
        </label>
        <details className="company-intake-more" open={!addToPipeline}>
        <summary>More company details</summary>
        <div className="intake-fields">
          <label>
            Geography
            <input
              required
              value={values.geography}
              onChange={(e) =>
                setValues({ ...values, geography: e.target.value })
              }
            />
          </label>
          <label>
            Sector
            <input
              required
              value={values.sector}
              onChange={(e) => setValues({ ...values, sector: e.target.value })}
            />
          </label>
        </div>
        <label>
          Funding stage
          <select
            value={values.stage}
            onChange={(e) => setValues({ ...values, stage: e.target.value })}
          >
            {[
              "Not evidenced",
              "Pre-seed",
              "Seed",
              "Series A",
              "Series B",
              "Growth",
            ].map((stage) => (
              <option key={stage}>{stage}</option>
            ))}
          </select>
        </label>
        <label>
          Current role
          <input
            required
            value={values.founder_role}
            onChange={(e) =>
              setValues({ ...values, founder_role: e.target.value })
            }
          />
        </label>
        <label>
          Prior employer, if known
          <input
            value={values.previous_employer}
            placeholder="Leave empty when not evidenced"
            onChange={(e) =>
              setValues({ ...values, previous_employer: e.target.value })
            }
          />
        </label>
        <label>
          Public profile URL, optional
          <input
            type="url"
            value={values.profile_url}
            onChange={(e) =>
              setValues({ ...values, profile_url: e.target.value })
            }
          />
        </label>
        <label>
          Working company summary
          <textarea
            value={values.description}
            maxLength={2000}
            onChange={(e) =>
              setValues({ ...values, description: e.target.value })
            }
          />
        </label>
        <label>
          Why-now hypothesis, optional
          <textarea
            value={values.why_now}
            maxLength={2000}
            onChange={(e) => setValues({ ...values, why_now: e.target.value })}
          />
          <small>
            This remains an analyst hypothesis until supported by evidence.
          </small>
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            checked={values.illustrative}
            onChange={(e) =>
              setValues({ ...values, illustrative: e.target.checked })
            }
          />
          This is a fictional example
        </label>
        </details>
        </fieldset>
        <button className="ws-button primary" disabled={submitting || busy || !canWrite}>
          {submitting || busy ? "Saving record…" : pendingCompany ? "Retry adding to pipeline" : addToPipeline ? "Add to pipeline" : "Capture & open company"}
          <Icon name="plus" size={16} />
        </button>
      </form>
    </Drawer>
  );
}

export function SourceCaptureForm({
  company,
  onClose,
}: {
  company: Company;
  onClose: () => void;
}) {
  const { act, busy, data } = useWorkspace();
  const [values, setValues] = useState(() => ({
    title: "",
    url: "",
    excerpt: "",
    captured_at: new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16),
    method: "Public page, manually captured",
    claim_id: "",
    statement: "",
    topic: "company",
    state: "Founder-reported" as EvidenceState,
    question:
      "What independent evidence would validate or contradict this claim?",
    confidence: 50,
    relationship: "supports",
    reviewed: false,
    rationale: "",
    calculation: "",
  }));
  const canWrite = ["analyst", "partner", "admin"].includes(data?.role ?? "");
  return (
    <Drawer title={`Capture evidence · ${company.name}`} onClose={onClose}>
      <p className="muted">
        Keep the exact excerpt close to the claim. The URL is stored as a
        reference; no crawler or external model is invoked.
      </p>
      {company.illustrative && (
        <div className="notice">
          This company is fictional. Sources added here retain the demonstration
          label.
        </div>
      )}
      {!canWrite && (
        <div className="notice error" role="alert">
          Your role can inspect evidence but cannot add sources.
        </div>
      )}
      <form
        className="workspace-form"
        onSubmit={async (e) => {
          e.preventDefault();
          const updated = await act(company, {
            action: "capture_source",
            capture: {
              ...values,
              captured_at: new Date(values.captured_at).toISOString(),
              claim_id: values.claim_id || null,
              calculation: values.calculation || null,
            },
          });
          if (updated) onClose();
        }}
      >
        <label>
          Source title
          <input
            required
            maxLength={250}
            value={values.title}
            onChange={(e) => setValues({ ...values, title: e.target.value })}
          />
        </label>
        <label>
          Original source URL
          <input
            type="url"
            required
            value={values.url}
            placeholder="https://company.com/about"
            onChange={(e) => setValues({ ...values, url: e.target.value })}
          />
        </label>
        <label>
          Captured date and time
          <input
            type="datetime-local"
            required
            value={values.captured_at}
            onChange={(e) =>
              setValues({ ...values, captured_at: e.target.value })
            }
          />
        </label>
        <label>
          Evidence method
          <select
            value={values.method}
            onChange={(e) => setValues({ ...values, method: e.target.value })}
          >
            {[
              "Public page, manually captured",
              "Founder deck, manually captured",
              "Analyst interview notes",
              "Public document, manually captured",
            ].map((method) => (
              <option key={method}>{method}</option>
            ))}
          </select>
        </label>
        <label>
          Supporting or contradicting excerpt
          <textarea
            required
            minLength={10}
            maxLength={12000}
            value={values.excerpt}
            placeholder="Paste the relevant passage, with the period or definition when a metric is involved."
            onChange={(e) => setValues({ ...values, excerpt: e.target.value })}
          />
        </label>
        <label>
          Link to claim
          <select
            value={values.claim_id}
            onChange={(e) => setValues({ ...values, claim_id: e.target.value })}
          >
            <option value="">Create a new claim</option>
            {company.claims.map((claim) => (
              <option key={claim.id} value={claim.id}>
                {claim.statement}
              </option>
            ))}
          </select>
        </label>
        {values.claim_id ? (
          <>
            <label>
              Relationship
              <select
                value={values.relationship}
                onChange={(e) =>
                  setValues({ ...values, relationship: e.target.value })
                }
              >
                <option value="supports">Supports the claim</option>
                <option value="contradicts">Contradicts the claim</option>
              </select>
            </label>
            <div className="notice">
              Supporting evidence preserves the claim&apos;s existing state.
              Contradicting evidence marks it Conflicted and preserves the
              previous value for canonical review.
            </div>
          </>
        ) : (
          <>
            <label>
              Claim statement
              <textarea
                required
                maxLength={2000}
                value={values.statement}
                onChange={(e) =>
                  setValues({ ...values, statement: e.target.value })
                }
              />
            </label>
            <label>
              Claim topic
              <select
                value={values.topic}
                onChange={(e) =>
                  setValues({ ...values, topic: e.target.value })
                }
              >
                {["company", "founder", "traction", "market", "other"].map(
                  (topic) => (
                    <option key={topic}>{topic}</option>
                  ),
                )}
              </select>
            </label>
            <label>
              Evidence state
              <select
                value={values.state}
                onChange={(e) =>
                  setValues({
                    ...values,
                    state: e.target.value as EvidenceState,
                  })
                }
              >
                {[
                  "Founder-reported",
                  "Verified",
                  "Calculated",
                  "AI-inferred",
                  "Missing",
                  "Conflicted",
                ].map((state) => (
                  <option key={state}>{state}</option>
                ))}
              </select>
              <small>
                Founder-reported includes statements in company-authored
                materials. Verified requires an explicit source review.
              </small>
            </label>
            {values.state === "Calculated" && (
              <label>
                Visible inputs and formula
                <textarea
                  required
                  value={values.calculation}
                  onChange={(e) =>
                    setValues({ ...values, calculation: e.target.value })
                  }
                />
              </label>
            )}
            <label>
              Next diligence question
              <textarea
                required
                value={values.question}
                onChange={(e) =>
                  setValues({ ...values, question: e.target.value })
                }
              />
            </label>
          </>
        )}
        <label>
          Evidence confidence · reviewer assessment
          <input
            required
            type="number"
            min={0}
            max={100}
            value={values.confidence}
            onChange={(e) =>
              setValues({ ...values, confidence: Number(e.target.value) })
            }
          />
          <small>
            Confidence describes this evidence item, not the probability of
            investment success.
          </small>
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            required={!values.claim_id && values.state === "Verified"}
            checked={values.reviewed}
            onChange={(e) =>
              setValues({ ...values, reviewed: e.target.checked })
            }
          />
          I reviewed the excerpt against its source
        </label>
        <label>
          Review rationale
          <textarea
            required={!values.claim_id && values.state === "Verified"}
            value={values.rationale}
            onChange={(e) =>
              setValues({ ...values, rationale: e.target.value })
            }
          />
        </label>
        <button className="ws-button primary" disabled={busy || !canWrite}>
          {busy ? "Saving evidence…" : "Capture source & claim"}
          <Icon name="source" size={16} />
        </button>
      </form>
    </Drawer>
  );
}
