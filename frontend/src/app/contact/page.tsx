import PublicPage from "@/components/workspace/PublicPage";

export default function Contact() {
  return <PublicPage title="Need a hand?" intro="Contact the person who shared this preview with you. A dedicated support inbox is not configured yet.">
    <section><h2>Report a problem</h2><p>Include the page, what you tried and the error message. A screenshot with private information removed can help. Do not include passwords, API keys or confidential research.</p></section>
    <section><h2>Suggest an improvement</h2><p>Tell the project owner what you were trying to decide and where the workflow became difficult. A specific example is more useful than a feature name.</p></section>
  </PublicPage>;
}
