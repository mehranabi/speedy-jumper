import { Capacitor, registerPlugin } from "@capacitor/core";

// Like analytics.js, these are registered without web implementations so the
// browser preview stays Firebase-free. Native crash reporting, app start,
// screen rendering and network traces are collected by the Firebase iOS SDKs
// on their own; this module adds what only the WebView can see: JavaScript
// errors (as Crashlytics non-fatals) and custom Performance traces.
const FirebaseCrashlytics = registerPlugin("FirebaseCrashlytics");
const FirebasePerformance = registerPlugin("FirebasePerformance");

const MAX_REPORTED_ERRORS = 20;

export function parseStack(stack = "") {
  // WebKit frames look like "functionName@url:line:column".
  return String(stack).split("\n").map((line) => {
    const match = /^(.*?)@(.*?):(\d+):\d+$/.exec(line.trim());
    if (!match) return null;
    const fileName = match[2].split("/").pop() || match[2];
    return { functionName: match[1] || "<anonymous>", fileName, lineNumber: Number(match[3]) };
  }).filter(Boolean).slice(0, 30);
}

export function createMonitoring({
  nativeIos = Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios",
  logger = console,
} = {}) {
  const enabled = Boolean(nativeIos);
  const reportedErrors = new Set();

  // Monitoring must never interrupt gameplay, so failures are only logged.
  const send = (label, fn) => {
    if (!enabled) return;
    Promise.resolve().then(fn).catch((error) => logger.warn?.(`${label} failed.`, error));
  };

  function recordError(error, source) {
    const message = String(error?.message ?? error ?? "Unknown error").slice(0, 500);
    // A failure inside the render loop would repeat every frame, so each
    // distinct message is reported once and the session total is capped.
    const key = `${source}:${message}`;
    if (reportedErrors.has(key) || reportedErrors.size >= MAX_REPORTED_ERRORS) return;
    reportedErrors.add(key);
    const stacktrace = parseStack(error?.stack);
    send("Crashlytics exception", () => FirebaseCrashlytics.recordException(stacktrace.length
      ? { message: `${source}: ${message}`, stacktrace }
      : { message: `${source}: ${message}`, domain: source }));
  }

  function installGlobalErrorHandlers(target = globalThis) {
    if (!enabled) return;
    target.addEventListener("error", (event) => recordError(event.error ?? event.message, "window.error"));
    target.addEventListener("unhandledrejection", (event) => recordError(event.reason, "unhandledrejection"));
  }

  function startTrace(traceName) {
    send(`Trace "${traceName}" start`, () => FirebasePerformance.startTrace({ traceName }));
  }

  function stopTrace(traceName, metrics = {}) {
    send(`Trace "${traceName}" stop`, async () => {
      for (const [metricName, num] of Object.entries(metrics)) {
        await FirebasePerformance.putMetric({ traceName, metricName, num: Math.round(num) });
      }
      await FirebasePerformance.stopTrace({ traceName });
    });
  }

  return { enabled, recordError, installGlobalErrorHandlers, startTrace, stopTrace };
}
