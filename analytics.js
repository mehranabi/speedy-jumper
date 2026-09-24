import { Capacitor, registerPlugin } from "@capacitor/core";

// Registered without a web implementation on purpose: the browser preview
// stays analytics-free and the bundle does not pull in the Firebase JS SDK.
// Native iOS gets the plugin from @capacitor-firebase/analytics, which reads
// ios/App/App/GoogleService-Info.plist and configures Firebase on load.
const FirebaseAnalytics = registerPlugin("FirebaseAnalytics");

export function createAnalytics({
  nativeIos = Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios",
  logger = console,
} = {}) {
  const enabled = Boolean(nativeIos);

  function logEvent(name, params = {}) {
    if (!enabled) return;
    // Analytics must never interrupt gameplay, so failures are only logged.
    Promise.resolve()
      .then(() => FirebaseAnalytics.logEvent({ name, params }))
      .catch((error) => logger.warn?.(`Analytics event "${name}" failed.`, error));
  }

  return { enabled, logEvent };
}
