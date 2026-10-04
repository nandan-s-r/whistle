"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Company, Source, date } from "@/lib/workspace";
import { Avatar, EvidenceChip, Icon } from "./Primitives";

const evidenceLabels = [
  ["Unreviewed", "A captured research note or statement still needs review. This label does not imply AI generation or independent verification."],
  [
    "Verified",
    "A reviewer checked the claim against its evidence. Open the source to see what was checked.",
  ],
  [
    "Founder-reported",
    "The company or founder says this. Independent confirmation is still needed.",
  ],
  [
    "Calculated",
    "A formula produced this value. Its inputs and assumptions still need inspection.",
  ],
  [
    "AI-inferred",
    "A model suggested this interpretation. It remains a hypothesis until reviewed.",
  ],
  [
    "Missing",
    "The evidence needed to answer this question has not been captured.",
  ],
  [
    "Conflicted",
    "Sources disagree. Review their dates and definitions before choosing a value.",
  ],
] as const;

export function WorkspaceGuide({ companies }: { companies: Company[] }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("Walkthrough");
  const [companyId, setCompanyId] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const company =
    companies.find((c) => c.id === companyId) ??
    companies.find((c) => !c.illustrative && c.sources.length) ??
    companies[0];
  useEffect(() => {
    if (!open) return;
    const panel = dialog.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel?.showModal();
    return () => {
      panel?.close();
      document.body.style.overflow = overflow;
    };
  }, [open]);
  const steps = [
    {
      title: "Start with the source",
      detail:
        "Read what was actually captured. Check the date, original page and review label.",
      tab: "Evidence",
      icon: "source",
      status: company
        ? `${company.sources.length} captured sources`
        : "Capture a first source",
    },
    {
      title: "Ask the next question",
      detail:
        "See what is uncertain, who owns the research and what would settle it.",
      tab: "Diligence",
      icon: "discover",
      status: company
        ? `${company.diligence_tasks.filter((t) => t.status !== "Complete").length} unfinished tasks`
        : "Plan the research",
    },
    {
      title: "Read the judgment",
      detail:
        "Follow the evidence into a saved memo, its objections and the conditions for revisiting the decision.",
      tab: "Memo",
      icon: "library",
      status: company?.memos.length
        ? `Saved memo v${company.memos.at(-1)!.version}`
        : "No memo saved yet",
    },
  ];
  return (
    <>
      <button
        className="explore-launch"
        onClick={() => setOpen(true)}
        aria-label="Explore the workspace"
      >
        <Icon name="compass" size={17} />
        <span>Explore</span>
      </button>
      <dialog
        ref={dialog}
        className="explore-dialog"
        aria-labelledby="explore-title"
        onCancel={(e) => {
          e.preventDefault();
          setOpen(false);
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(false);
        }}
      >
        <section className="explore-content">
          <header className="explore-heading">
            <span className="eyebrow">WORKSPACE GUIDE</span>
            <button
              className="icon-button"
              onClick={() => setOpen(false)}
              aria-label="Close workspace guide"
            >
              <Icon name="close" />
            </button>
            <h2 id="explore-title">How to research a company</h2>
            <p>
              Open the sources, plan the research and read the saved memo.
            </p>
          </header>
          <div
            className="explore-tabs"
            role="group"
            aria-label="Workspace guide topics"
          >
            {["Walkthrough", "Evidence labels", "Useful terms"].map((t) => (
              <button
                key={t}
                aria-pressed={mode === t}
                onClick={() => setMode(t)}
              >
                {t}
              </button>
            ))}
          </div>
          {mode === "Walkthrough" ? (
            <>
              {company && (
                <div className="explore-company">
                  <Avatar name={company.name} />
                  <label>
                    Explore a company
                    <select
                      value={company.id}
                      onChange={(e) => setCompanyId(e.target.value)}
                    >
                      {companies.map((c) => (
                        <option value={c.id} key={c.id}>
                          {c.name} ·{" "}
                          {c.illustrative
                            ? "Fictional demo"
                            : "Captured research"}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
              <div className="explore-steps">
                {steps.map((s, i) => (
                  <Link
                    className="explore-step"
                    key={s.tab}
                    onClick={() => setOpen(false)}
                    href={
                      company
                        ? `/companies/${company.id}?tab=${s.tab}`
                        : "/discover"
                    }
                  >
                    <span className="explore-step-icon">
                      <Icon name={s.icon} />
                    </span>
                    <div>
                      <span className="eyebrow">
                        0{i + 1} / {s.status}
                      </span>
                      <h3>{s.title}</h3>
                      <p>{s.detail}</p>
                    </div>
                    <Icon />
                  </Link>
                ))}
              </div>
              <p className="explore-footnote">
                <Icon name="check" size={16} /> Exploring does not edit the
                company. You make the final call.
              </p>
            </>
          ) : mode === "Evidence labels" ? (
            <div className="explore-glossary">
              {evidenceLabels.map(([state, explanation]) => (
                <div key={state}>
                  <EvidenceChip state={state} />
                  <p>{explanation}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="explore-terms">
              {[
                [
                  "Thesis",
                  "The kinds of companies you want to find, and why you think they could matter.",
                ],
                [
                  "Diligence",
                  "Research that tests the company's claims, risks and unanswered questions.",
                ],
                [
                  "IC memo",
                  "An investment committee document explaining the recommendation, evidence and objections.",
                ],
            [
              "Pass / Watch",
              "Pass means do not pursue the opportunity now. Watch means keep it under observation. Neither means an investment is approved.",
            ],
                [
                  "Frozen version",
                  "A saved snapshot. Later edits to the company do not rewrite the original memo or model.",
                ],
                [
                  "MOIC",
                  "Multiple on invested capital: total proceeds divided by total money invested.",
                ],
                [
                  "IRR",
                  "An annualised return estimate based on the timing of investments and proceeds.",
                ],
              ].map(([term, explanation]) => (
                <div key={term}>
                  <h3>{term}</h3>
                  <p>{explanation}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </dialog>
    </>
  );
}

export function ResearchSpotlight({ company }: { company: Company }) {
  const [scene, setScene] = useState("The evidence");
  const source = company.sources[0];
  const question = company.diligence_tasks.find((t) => t.status !== "Complete");
  const claim = company.claims.find(
    (c) => c.state !== "Verified" && c.state !== "Calculated",
  );
  const decision = company.decisions.at(-1);
  const tab =
    scene === "The evidence"
      ? "Evidence"
      : scene === "The question"
        ? "Diligence"
        : "Memo";
  return (
    <section className="research-spotlight" aria-labelledby="spotlight-title">
      <div className="spotlight-intro">
        <span className="eyebrow">
          RESEARCH IN FOCUS{" "}
          <span>
            {company.illustrative ? "FICTIONAL DEMO" : "PUBLIC-SOURCE CASE"}
          </span>
        </span>
        <div className="spotlight-identity">
          <Avatar name={company.name} large />
          <div>
            <h2 id="spotlight-title">{company.name}</h2>
            <span>
              {company.domain} · {company.sector}
            </span>
          </div>
        </div>
        <p>
          {company.description ||
            "A company record ready for its first sources and questions."}
        </p>
        <div className="spotlight-facts">
          <span>
            <strong>{company.sources.length}</strong> sources
          </span>
          <span>
            <strong>{company.claims.length}</strong> claims
          </span>
          <span>
            <strong>
              {company.claims.filter((c) => c.state === "Verified").length}
            </strong>{" "}
            verified
          </span>
        </div>
        <Link
          href={`/companies/${company.id}?tab=Overview`}
          className="spotlight-open"
        >
          Explore this company <Icon size={16} />
        </Link>
      </div>
      <div className="spotlight-preview">
        <div
          className="spotlight-scenes"
          role="group"
          aria-label="Explore the research story"
        >
          {["The evidence", "The question", "The judgment"].map((label, i) => (
            <button
              key={label}
              aria-pressed={scene === label}
              onClick={() => setScene(label)}
            >
              <span>0{i + 1}</span>
              {label}
            </button>
          ))}
        </div>
        <div className="spotlight-scene" key={scene}>
          {scene === "The evidence" ? (
            <>
              <span className="eyebrow">
                CAPTURED SOURCE {source ? `· ${date(source.captured_at)}` : ""}
              </span>
              <h3>{source?.title ?? "No sources captured yet"}</h3>
              <blockquote>
                {source?.excerpt ||
                  "Capture an original source before testing the company's claims."}
              </blockquote>
            </>
          ) : scene === "The question" ? (
            <>
              <span className="eyebrow">
                {question?.status === "Blocked"
                  ? "RESEARCH BLOCKED"
                  : "STILL TO UNDERSTAND"}
              </span>
              <h3>{question?.title || "The next question"}</h3>
              <p>
                {question?.question ||
                  claim?.question ||
                  "No unresolved research question is recorded. Review the evidence coverage before moving forward."}
              </p>
              <span className="scene-owner">
                Owner: {question?.owner ?? company.owner}
              </span>
            </>
          ) : (
            <>
              <span className="eyebrow">
                {decision ? "RECORDED DECISION" : "CURRENT DISPOSITION"}
              </span>
              <h3>{company.disposition}</h3>
              <p>
                {decision?.rationale ||
                  "No formal decision rationale is recorded yet. The analyst owns the recommendation."}
              </p>
            </>
          )}
        </div>
        <Link
          className="spotlight-preview-link"
          href={`/companies/${company.id}?tab=${tab}`}
        >
          {scene === "The evidence"
            ? "Inspect the sources"
            : scene === "The question"
              ? "Open the research plan"
              : "Read the memo"}
          <Icon size={15} />
        </Link>
      </div>
    </section>
  );
}

const chapterNames: Record<string, string> = {
  "EXECUTIVE RECOMMENDATION": "Recommendation",
  "WHY NOW": "Why now",
  "WHY THIS TEAM": "The team",
  "WHY THIS MARKET": "The market",
  "WHY THE COMPANY CAN WIN": "Competitive advantage",
  "REVIEWED EVIDENCE BEHIND THE RECOMMENDATION": "Reviewed evidence",
  "MATERIAL RISKS / COUNTER-CASE": "Risks & counter-case",
  "DILIGENCE WORK / OUTCOMES": "Research & outcomes",
  "OPEN ASSUMPTIONS": "Open assumptions",
  "RETURN SCENARIOS": "Return scenarios",
  "DISSENT / OBJECTIONS": "Objections",
  "DECISION HISTORY": "Decision history",
  "CONDITIONS THAT WOULD REVERSE THE DECISION": "When to revisit",
  "MONITORING TRIGGERS": "Monitoring triggers",
  "MODEL / EVIDENCE SNAPSHOT": "Version snapshot",
};

export function MemoReader({ memo }: { memo: Company["memos"][number] }) {
  const [source, setSource] = useState<Source | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!source) return;
    const panel = dialog.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel?.showModal();
    return () => {
      panel?.close();
      document.body.style.overflow = overflow;
    };
  }, [source]);
  const blocks = memo.text.split(/\n\s*\n/);
  const sections = blocks.map((block, index) => {
    const [heading, ...body] = block.split("\n");
    return {
      heading,
      body: body.join("\n"),
      id: `memo-${memo.version}-section-${index}`,
    };
  });
  function cited(text: string) {
    return text.split(/(\[S[A-Za-z0-9]+\])/g).map((part, i) => {
      const sourceIndex = memo.sources.findIndex((s) => `[${s.id}]` === part);
      const frozen = memo.sources[sourceIndex];
      return frozen ? (
        <button
          key={i}
          className="memo-citation"
          title={frozen.title}
          aria-label={`Inspect frozen source: ${frozen.title}`}
          onClick={() => setSource(frozen)}
        >
          [{sourceIndex + 1}]
        </button>
      ) : (
        part
      );
    });
  }
  return (
    <>
      <div className="memo-reader">
        <aside className="memo-outline">
          <span className="eyebrow">IN THIS MEMO</span>
          <nav aria-label="Memo outline">
            {sections.slice(1).map((s) => (
              <a key={s.id} href={`#${s.id}`}>
                {chapterNames[s.heading] ?? s.heading}
              </a>
            ))}
          </nav>
          <span className="memo-outline-note">
            <Icon name="source" size={15} /> Citation buttons open the source
            saved with this version.
          </span>
        </aside>
        <article
          className="memo-paper"
          aria-label={`Frozen memo version ${memo.version}`}
        >
          <header>
            <span className="eyebrow">
              INVESTMENT COMMITTEE / V{memo.version}
            </span>
            <h2>
              {sections[0]?.heading.replace("INVESTMENT COMMITTEE · ", "")}
            </h2>
            <p>{sections[0]?.body}</p>
            <div className="memo-byline">
              {memo.owner} <span>·</span> {date(memo.at)} <span>·</span>{" "}
              {memo.model_version
                ? `Model v${memo.model_version}`
                : "Evidence-only"}
            </div>
          </header>
          {sections.slice(1).map((s) => (
            <section id={s.id} key={s.id}>
              <h3>{chapterNames[s.heading] ?? s.heading}</h3>
              <div className="memo-paragraphs">
                {s.body.split("\n").map((line, i) => (
                  <p key={i}>{cited(line)}</p>
                ))}
              </div>
            </section>
          ))}
        </article>
      </div>
      <details className="memo-original">
        <summary>View original saved text</summary>
        <pre className="artifact-text">{memo.text}</pre>
      </details>
      <dialog
        ref={dialog}
        className="frozen-source-dialog"
        aria-labelledby="frozen-source-title"
        onCancel={(e) => {
          e.preventDefault();
          setSource(null);
        }}
      >
        <section>
          <header>
            <span className="eyebrow">
              FROZEN SOURCE / MEMO V{memo.version}
            </span>
            <button
              className="icon-button"
              aria-label="Close frozen source"
              onClick={() => setSource(null)}
            >
              <Icon name="close" />
            </button>
          </header>
          <h2 id="frozen-source-title">{source?.title}</h2>
          <p className="muted">
            Captured {source ? date(source.captured_at) : ""} · {source?.method}
          </p>
          <blockquote>{source?.excerpt}</blockquote>
          {source?.url && !source.illustrative && (
            <a
              className="ws-button secondary"
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open original source <Icon size={16} />
            </a>
          )}
          {source?.illustrative && (
            <p className="notice">Fictional demonstration source.</p>
          )}
        </section>
      </dialog>
    </>
  );
}

export function ResearchOrientation({ tab }: { tab: string }) {
  const descriptions: Record<string, [string, string]> = {
    Evidence: [
      "What can you trust?",
      "A source is a document or page. A claim is a statement you test against it. Open either to inspect the evidence.",
    ],
    Diligence: [
      "What do you still need to learn?",
      "Turn uncertainty into a question, assign the research and capture an outcome. Completing a task does not verify its claim.",
    ],
    Model: [
      "What would the investment return?",
      "Enter explicit assumptions, then save a version of the calculation. MOIC measures money returned; IRR includes the holding period.",
    ],
    Memo: [
      "Why make this decision?",
      "The memo brings the case, counter-case and evidence together. Each version preserves the sources and assumptions available when it was saved.",
    ],
    Monitor: [
      "What would change your mind?",
      "Compare recorded outcomes with the assumptions behind the decision. Investigate a crossed threshold before acting.",
    ],
  };
  const description = descriptions[tab];
  if (!description) return null;
  return (
    <details className="research-orientation">
      <summary>
        <Icon name="compass" size={16} />
        {description[0]}
        <span>Quick guide</span>
      </summary>
      <p>{description[1]}</p>
    </details>
  );
}
