import { FrozenModel, date } from "@/lib/workspace";
import { Drawer } from "./Primitives";

export type CalculationSelection = { scenario: string } | { row: number; column: number };
const dollars = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
const percent = (value: number) => `${(value * 100).toFixed(2)}%`;

export default function ModelCalculation({ model, selection, onClose }: { model: FrozenModel; selection: CalculationSelection; onClose: () => void }) {
  const sensitivity = "row" in selection;
  const scenario = sensitivity ? "Base" : selection.scenario;
  const multipliers: Record<string, [number, number]> = { Downside: [.5, .7], Base: [1, 1], Upside: [1.5, 1.3] };
  const [arrFactor, multipleFactor] = sensitivity ? [[.5, 1, 1.5][selection.row], [.7, 1, 1.3][selection.column]] : multipliers[scenario];
  const inputs = model.inputs;
  const saved = model.scenarios[scenario];
  const arr = inputs.arr * arrFactor;
  const multiple = inputs.multiple * multipleFactor;
  const exitValue = sensitivity ? arr * multiple : saved.exit_value;
  const proceeds = sensitivity ? exitValue * saved.exit_ownership : saved.proceeds;
  const moic = sensitivity ? model.sensitivity[selection.row][selection.column] : saved.moic;
  const followYear = Math.min(2, inputs.years);
  const steps = [
    { label: "Initial ownership", formula: "Initial investment ÷ (entry valuation + initial investment)", inputs: `${dollars(inputs.check)} ÷ (${dollars(inputs.pre_money)} + ${dollars(inputs.check)})`, value: percent(saved.initial_ownership) },
    { label: "Exit ownership", formula: "Initial ownership × (1 − dilution) + follow-on investment ÷ follow-on post-money", inputs: `${percent(saved.initial_ownership)} × (1 − ${percent(inputs.dilution)}) + ${dollars(inputs.follow_on)} ÷ ${dollars(inputs.follow_on_post_money)}`, value: percent(saved.exit_ownership) },
    { label: "Exit value", formula: "Scenario ARR × scenario exit multiple", inputs: `${dollars(arr)} × ${multiple.toFixed(2)}x`, value: dollars(exitValue) },
    { label: "Investment proceeds", formula: "Exit value × exit ownership", inputs: `${dollars(exitValue)} × ${percent(saved.exit_ownership)}`, value: dollars(proceeds) },
    { label: "Total invested", formula: "Initial investment + follow-on investment", inputs: `${dollars(inputs.check)} + ${dollars(inputs.follow_on)}`, value: dollars(saved.invested) },
    { label: "MOIC", formula: "Investment proceeds ÷ total invested", inputs: `${dollars(proceeds)} ÷ ${dollars(saved.invested)}`, value: `${moic.toFixed(2)}x` },
  ];
  return <Drawer title="How this return is calculated" onClose={onClose}>
    <span className="eyebrow">MODEL V{model.version} · {sensitivity ? "SENSITIVITY CELL" : scenario.toUpperCase()}</span>
    <h3 className="calculation-title">{moic.toFixed(2)}x money returned</h3>
    <p className="muted">Saved by {model.owner} on {date(model.at)}. This explanation uses this version’s inputs, not your current draft.</p>
    <div className="calculation-scenario"><strong>Scenario assumptions</strong><p>ARR: {dollars(arr)} ({arrFactor.toFixed(1)}× base). Exit multiple: {multiple.toFixed(2)}x ({multipleFactor.toFixed(1)}× base).</p><small>Displayed values are rounded. The calculation uses full precision.</small></div>
    <ol className="calculation-steps">{steps.map(step => <li key={step.label}><div><h4>{step.label}</h4><strong>{step.value}</strong></div><p>{step.formula}</p><code>{step.inputs}</code></li>)}</ol>
    {!sensitivity && <section className="calculation-cashflows"><h3>Annual IRR: {percent(saved.irr)}</h3><p>IRR is the annual rate that balances these cash flows. It accounts for the timing of the follow-on investment.</p><div className="table-scroll"><table className="research-table"><caption>Cash flows used for IRR</caption><thead><tr><th scope="col">Year</th><th scope="col">Cash flow</th><th scope="col">Amount</th></tr></thead><tbody><tr><td>0</td><td>Initial investment</td><td>{dollars(-inputs.check)}</td></tr><tr><td>{followYear}</td><td>Follow-on investment</td><td>{dollars(-inputs.follow_on)}</td></tr><tr><td>{inputs.years}</td><td>Exit proceeds</td><td>{dollars(proceeds)}</td></tr></tbody></table></div><p className="calculation-equation">0 = −initial investment − follow-on / (1 + IRR)<sup>{followYear}</sup> + exit proceeds / (1 + IRR)<sup>{inputs.years}</sup></p></section>}
    <section className="calculation-sources"><h3>Assumptions behind this version</h3>{model.assumptions.map(a => { const source = model.sources?.find(s => s.id === a.source_id); return <details key={a.id}><summary>{a.label} · {a.source_id ?? "Analyst assumption"}</summary><p>{a.rationale}</p><small>{a.owner} · Updated {date(a.modified_at)}</small>{source && <><h4>{source.title}</h4><p className="muted">{source.id} · Captured {date(source.captured_at)} · {source.illustrative ? "Fictional source" : source.method}</p><blockquote>{source.excerpt}</blockquote>{!source.illustrative && source.url && <a className="text-link" href={source.url} target="_blank" rel="noopener noreferrer">Open original source</a>}</>}</details>; })}</section>
    <p className="studio-boundary">{model.method} A calculated return is a scenario, not a forecast or a verified outcome.</p>
  </Drawer>;
}
