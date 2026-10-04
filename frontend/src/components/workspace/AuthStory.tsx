import { ScopeBrand } from "./Brand";
import ThemeToggle from "./ThemeToggle";

export default function AuthStory() {
  return <section className="auth-story">
    <ThemeToggle className="auth-theme-toggle" />
    <ScopeBrand/>
    <div className="auth-pitch">
      <span className="eyebrow">YOUR INVESTMENT WORKSPACE</span>
      <h1>A clearer view<br/>of every deal.</h1>
      <p>Keep company research, open questions and investment decisions together.</p>
      <ol className="auth-workflow" aria-label="Investment workflow preview">
        {[{title:"Research",detail:"Companies and the sources behind their claims."},{title:"Review",detail:"Questions, assumptions and the next step."},{title:"Decide",detail:"Your investment view, with its reasoning."}].map((step,i) => <li key={step.title}><span>0{i+1}</span><div><h3>{step.title}</h3><p>{step.detail}</p></div></li>)}
      </ol>
    </div>
    <div className="auth-story-footer">Whistle · Investment research</div>
  </section>;
}
