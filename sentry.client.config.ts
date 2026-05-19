import * as Sentry from "@sentry/nextjs";

if (typeof window !== 'undefined') {
  Sentry.init({
    dsn: "https://f3160e7601f08b9532f5dcae4d93a864@o4511415204577280.ingest.us.sentry.io/4511415208050688",
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0.0,
    integrations: [],
  });
}
