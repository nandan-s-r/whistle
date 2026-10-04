import PublicPage from "@/components/workspace/PublicPage";

export default function CookiePolicy() {
  return <PublicPage title="What your browser remembers." intro="Sign-in details, appearance and working views help you return to the same workspace.">
    <section><h2>Your sign-in session</h2><p>Local-preview sign-in stores its access token in browser local storage. Cloud sign-in uses the configured Supabase session, including its browser cookies. Signing out removes the local token and requests cloud sign-out when configured. Use sign-out when you finish on a shared computer.</p></section>
    <section><h2>Appearance and working views</h2><p>The light or dark appearance choice is saved in local storage. Search, filters and selected working views may use session storage so they survive navigation in the current tab. These preferences do not change your research records.</p></section>
    <section><h2>Optional analytics</h2><p>If PostHog is configured, the app uses memory-based analytics with automatic page tracking and session recording disabled. The app does not configure advertising trackers. This description covers the app code; check your hosting and provider configuration before publishing a final cookie policy.</p></section>
    <section><h2>Clearing browser data</h2><p>Clearing site data resets saved appearance and sign-in details. It does not delete company research from the server database.</p></section>
  </PublicPage>;
}
