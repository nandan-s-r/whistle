import { initializeAnalytics } from "@/lib/telemetry";

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  void import("@sentry/nextjs").then(Sentry => Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      graphQL: { document: false, variables: false },
      genAI: { inputs: false, outputs: false },
      databaseQueryData: false,
      queues: false,
      stackFrameVariables: false,
      frameContextLines: 0,
    },
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    beforeSend(event) {
      return {
        type: event.type,
        event_id: event.event_id,
        timestamp: event.timestamp,
        level: event.level,
        platform: event.platform,
        exception: {
          values: event.exception?.values?.map((error) => ({
            type: error.type,
            value: "Application error; private details omitted",
            stacktrace: {
              frames: error.stacktrace?.frames?.map((frame) => ({
                filename: frame.filename?.split("?")[0],
                function: frame.function,
                lineno: frame.lineno,
                in_app: frame.in_app,
              })),
            },
          })),
        },
      };
    },
  })).catch(() => { /* Optional monitoring must not block the workspace. */ });
}
void initializeAnalytics();
