import Link from "next/link";
import { Icon } from "./Primitives";

export default function WelcomeDesk({ pathname, busy, initialize }: {
  pathname: string;
  busy: boolean;
  initialize: () => void;
}) {
  const portfolio = pathname === "/portfolio";
  const pipeline = pathname === "/pipeline";
  return <section className="welcome-state welcome-desk">
    <div className="welcome-heading">
      <span className="eyebrow">{portfolio ? "PORTFOLIO" : pipeline ? "PIPELINE" : "YOUR RESEARCH DESK"}</span>
      <h1>{portfolio ? "Keep the investment in view." : pipeline ? "Make room for your first deal." : "Start with one company."}</h1>
      <p>{portfolio ? "Track completed investments and the changes that need your attention." : "Add a company and its first source. Then decide what needs a closer look."}</p>
      <div className="button-row">
        <Link href="/pipeline" className="ws-button primary">Add your first company<Icon name="plus" size={16}/></Link>
        <button className="ws-button secondary" disabled={busy} onClick={initialize}>{busy ? "Preparing scenario…" : "Open demonstration scenario"}<Icon size={16}/></button>
      </div>
      <p className="welcome-demo-note">The demonstration adds four fictional companies, clearly labelled as demo records.</p>
    </div>
    <div className="welcome-record" aria-label="Research workflow preview">
      <header><span className="welcome-file-icon"><Icon name="source" size={22}/></span><div><span className="eyebrow">A COMPANY RECORD</span><h2>From source to decision</h2></div><span className="reference-tag">Preview</span></header>
      <ol>
        <li><span className="welcome-step-number">01</span><div><h3>Capture a source</h3><p>Keep the excerpt and the claim it supports.</p></div><Icon name="source" size={18}/></li>
        <li><span className="welcome-step-number">02</span><div><h3>Review the questions</h3><p>Compare claims and test the financial assumptions.</p></div><Icon name="discover" size={18}/></li>
        <li><span className="welcome-step-number">03</span><div><h3>Record a decision</h3><p>Save your reasoning and when to revisit it.</p></div><Icon name="check" size={18}/></li>
      </ol>
      <footer><Icon name="library" size={16}/><span>Sources and earlier decisions stay with the record.</span></footer>
    </div>
    <div className="welcome-shortcuts">
      <Link href="/library"><Icon name="library"/><div><strong>Browse the guide</strong><span>Help with research, questions and decisions</span></div><Icon size={16}/></Link>
      <Link href="/library?section=Connections%20%26%20imports"><Icon name="settings"/><div><strong>Set up your sources</strong><span>Connections and permitted imports</span></div><Icon size={16}/></Link>
    </div>
  </section>;
}
