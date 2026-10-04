import Link from "next/link";
import { ScopeBrand } from "./Brand";
import ThemeToggle from "./ThemeToggle";

export default function PublicPage({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return <div className="public-page">
    <header className="public-header"><ScopeBrand/><ThemeToggle/></header>
    <main id="main-content" className="public-content">
      <span className="eyebrow">WHISTLE · LOCAL PREVIEW</span>
      <h1>{title}</h1><p className="public-intro">{intro}</p>
      {children}
      <Link href="/login" className="public-action">Sign in to your workspace →</Link>
    </main>
    <footer className="public-footer"><nav aria-label="Product information">
      {[['/about', 'About'], ['/privacy', 'Privacy'], ['/cookies', 'Browser storage'], ['/terms', 'Preview use'], ['/contact', 'Help']].map(([href, label]) => <Link href={href} key={href}>{label}</Link>)}
    </nav><p>Research tools for decisions that need a clear explanation.</p></footer>
  </div>;
}
