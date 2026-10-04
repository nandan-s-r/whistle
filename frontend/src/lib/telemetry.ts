import type { PostHog } from "posthog-js";
let posthog: PostHog | undefined;
let starting: Promise<void> | undefined;
export const analyticsConfigured = Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);
let initialized = false;
export function initializeAnalytics(): Promise<void> {
  if (!analyticsConfigured || initialized) return Promise.resolve();
  starting ??= import("posthog-js").then(({ default: client }) => {
  posthog = client;
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host:
      process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    disable_session_recording: true,
    persistence: "memory",
    person_profiles: "never",
    advanced_disable_feature_flags: true,
    sanitize_properties: (props) =>
      Object.fromEntries(
        Object.entries(props).filter(([key]) =>
          [
            "$lib",
            "$lib_version",
            "distinct_id",
            "action",
            "succeeded",
          ].includes(key),
        ),
      ),
  });
  initialized = true;
  }).catch(() => { starting = undefined; });
  return starting;
}
export function trackWorkflow(
  action:
    | "company_capture"
    | "source_capture"
    | "claim_review"
    | "screen"
    | "decision"
    | "model"
    | "memo"
    | "draft_review",
  succeeded: boolean,
) {
  if (!initialized || !posthog) return;
  posthog.capture("workspace_action", { action, succeeded });
}
