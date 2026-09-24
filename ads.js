const PRODUCTION_IOS_INTERSTITIAL_ID = "ca-app-pub-1684528554830333/7866864766";

export const replayAdConfig = Object.freeze({
  // Production interstitial ad unit owned by this app's AdMob account.
  interstitialId: PRODUCTION_IOS_INTERSTITIAL_ID,
  isTesting: false,
  maxAdContentRating: "General",
  moduleTimeoutMs: 8_000,
  consentInfoTimeoutMs: 10_000,
  sdkInitializationTimeoutMs: 35_000,
  loadTimeoutMs: 8_000,
  presentTimeoutMs: 12_000,
});

export function isNativeIosRuntime(runtime = globalThis) {
  if (runtime.__VOID_SPHERES_ADS_TEST__?.enabled) return true;
  const protocol = runtime.location?.protocol || "";
  const capacitor = runtime.Capacitor;
  if (capacitor?.isNativePlatform?.() && capacitor?.getPlatform?.() === "ios") return true;
  return protocol === "voidspheres:" || protocol === "capacitor:";
}

export function createReplayAdService({
  nativeIos = isNativeIosRuntime(),
  loadPlugin = () => globalThis.__VOID_SPHERES_ADS_TEST__?.module
    ? Promise.resolve(globalThis.__VOID_SPHERES_ADS_TEST__.module)
    : import("@capacitor-community/admob"),
  getMuted = () => false,
  isAppVisible = () => !globalThis.document || globalThis.document.visibilityState === "visible",
  onStateChange = () => {},
  config = replayAdConfig,
  logger = console,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
} = {}) {
  const settings = { ...replayAdConfig, ...config };
  const state = {
    supported: Boolean(nativeIos),
    initialized: false,
    sdkInitialized: false,
    consentSettled: !nativeIos,
    consentPending: false,
    canRequest: false,
    ready: false,
    loading: false,
    showing: false,
    privacyFormShowing: false,
    privacyOptionsRequired: false,
    phase: nativeIos ? "idle" : "unsupported",
    impressions: 0,
    lastError: "",
    lastErrorDetail: "",
  };

  let plugin = null;
  let events = null;
  let privacyStatuses = null;
  let initializationPromise = null;
  let sdkInitializationPromise = null;
  let loadAttempt = null;
  let privacyPromise = null;
  let pendingShow = null;
  let loadGeneration = 0;
  let showGeneration = 0;
  let destroyed = false;
  const listenerHandles = [];

  const snapshot = () => ({ ...state });
  const notify = () => onStateChange(snapshot());
  const recordError = (message, error) => {
    state.lastError = message;
    // The native SDK's own reason (e.g. AdMob's "No ad to show"), kept short
    // enough to report as an analytics parameter.
    state.lastErrorDetail = String(error?.message ?? error ?? "").slice(0, 100);
    logger.warn?.(message, error);
    notify();
  };

  const withTimeout = (promise, timeoutMs, message) => new Promise((resolve, reject) => {
    const timeout = setTimer(() => reject(new Error(message)), timeoutMs);
    Promise.resolve(promise).then(
      (value) => {
        clearTimer(timeout);
        resolve(value);
      },
      (error) => {
        clearTimer(timeout);
        reject(error);
      },
    );
  });

  function invalidatePreparedAd() {
    loadGeneration += 1;
    state.ready = false;
    if (!state.showing) {
      state.phase = state.privacyFormShowing ? "privacy" : state.canRequest ? "idle" : "unavailable";
    }
    notify();
  }

  function schedulePreload(delayMs = 500) {
    if (destroyed || !state.canRequest || state.privacyFormShowing || state.showing) return;
    setTimer(() => {
      if (!destroyed) void preload();
    }, delayMs);
  }

  function settleShow(generation, result) {
    if (!pendingShow || pendingShow.generation !== generation) return;
    const { resolve, presentTimeout } = pendingShow;
    pendingShow = null;
    if (presentTimeout) clearTimer(presentTimeout);
    state.showing = false;
    state.phase = state.canRequest ? "idle" : "unavailable";
    notify();
    resolve(result);
    schedulePreload();
  }

  async function registerListeners() {
    const add = async (event, listener) => {
      listenerHandles.push(await plugin.addListener(event, listener));
    };

    // Load readiness is scoped to the promise returned by prepareInterstitial.
    // Global load events are intentionally not used because a native load can
    // finish after a JavaScript timeout or after the user changes consent.
    await add(events.Showed, () => {
      if (!pendingShow) return;
      pendingShow.presented = true;
      if (pendingShow.presentTimeout) {
        clearTimer(pendingShow.presentTimeout);
        pendingShow.presentTimeout = null;
      }
      state.showing = true;
      state.phase = "showing";
      notify();
    });
    await add(events.AdImpression, () => {
      if (!pendingShow) return;
      state.impressions += 1;
      notify();
    });
    await add(events.Dismissed, () => {
      if (!pendingShow) return;
      settleShow(pendingShow.generation, { shown: true, reason: "dismissed" });
    });
    await add(events.FailedToShow, (error) => {
      if (!pendingShow) return;
      const generation = pendingShow.generation;
      recordError("Interstitial ad failed to show.", error);
      settleShow(generation, { shown: false, reason: "failed-to-show" });
    });
  }

  async function refreshConsent({ allowForm = true } = {}) {
    state.consentPending = true;
    state.phase = "consent";
    notify();
    let presentedForm = false;
    try {
      let info = await withTimeout(
        plugin.requestConsentInfo({ tagForUnderAgeOfConsent: false }),
        settings.consentInfoTimeoutMs,
        "Ad consent information timed out.",
      );
      if (!info.canRequestAds && allowForm && info.isConsentFormAvailable) {
        presentedForm = true;
        state.privacyFormShowing = true;
        state.phase = "privacy";
        notify();
        // Once the native form is visible, let the user dismiss it. A watchdog
        // here could resume gameplay underneath a legitimate consent screen.
        info = await plugin.showConsentForm();
      }
      state.canRequest = Boolean(info.canRequestAds);
      state.privacyOptionsRequired = info.privacyOptionsRequirementStatus === privacyStatuses.REQUIRED;
      state.phase = state.canRequest ? "idle" : "unavailable";
      notify();
      return info;
    } finally {
      state.consentPending = false;
      if (presentedForm) state.privacyFormShowing = false;
      notify();
    }
  }

  async function ensureSdkInitialized() {
    if (state.sdkInitialized) return true;
    if (!plugin || !state.initialized || !state.canRequest || destroyed) return false;
    if (sdkInitializationPromise) return sdkInitializationPromise;

    sdkInitializationPromise = (async () => {
      state.phase = "initializing-sdk";
      notify();
      try {
        await withTimeout(plugin.initialize({
          initializeForTesting: settings.isTesting,
          maxAdContentRating: settings.maxAdContentRating,
        }), settings.sdkInitializationTimeoutMs, "AdMob SDK initialization timed out.");
        state.sdkInitialized = true;
        state.phase = "idle";
        state.lastError = "";
        state.lastErrorDetail = "";
        notify();
        return true;
      } catch (error) {
        state.sdkInitialized = false;
        state.phase = "unavailable";
        recordError("AdMob SDK initialization failed.", error);
        return false;
      } finally {
        sdkInitializationPromise = null;
      }
    })();
    return sdkInitializationPromise;
  }

  async function initialize() {
    if (initializationPromise) return initializationPromise;
    if (!state.supported) return snapshot();

    initializationPromise = (async () => {
      state.phase = "initializing";
      notify();
      try {
        const module = await withTimeout(
          loadPlugin(),
          settings.moduleTimeoutMs,
          "AdMob module loading timed out.",
        );
        plugin = module.AdMob;
        events = module.InterstitialAdPluginEvents;
        privacyStatuses = module.PrivacyOptionsRequirementStatus;
        if (!plugin || !events || !privacyStatuses) throw new Error("AdMob plugin exports are unavailable.");

        await withTimeout(registerListeners(), settings.moduleTimeoutMs, "AdMob listener setup timed out.");
        state.initialized = true;

        try {
          // UMP is resolved before initializing Google Mobile Ads because the
          // SDK or mediation adapters may preload on initialization.
          await refreshConsent();
        } catch (error) {
          state.canRequest = false;
          state.phase = "unavailable";
          recordError("Ad consent could not be established.", error);
        }

        state.consentSettled = true;
        notify();
        if (state.canRequest && await ensureSdkInitialized()) void preload();
      } catch (error) {
        state.initialized = false;
        state.sdkInitialized = false;
        state.canRequest = false;
        state.phase = "unavailable";
        recordError("AdMob initialization failed.", error);
      } finally {
        // Failure is fail-open for gameplay, but never grants permission to
        // request an ad when consent status is unknown.
        state.consentSettled = true;
        notify();
      }
      return snapshot();
    })();

    return initializationPromise;
  }

  async function preload() {
    if (!state.supported || destroyed) return false;
    if (!state.initialized) await initialize();
    if (!state.canRequest || state.privacyFormShowing || state.ready || state.showing) return state.ready;
    if (!state.sdkInitialized && !await ensureSdkInitialized()) return false;
    if (loadAttempt) return loadAttempt.availabilityPromise;

    const generation = ++loadGeneration;
    state.loading = true;
    state.phase = "loading";
    notify();

    const attempt = { generation, availabilityPromise: null };
    const nativePromise = Promise.resolve().then(() => plugin.prepareInterstitial({
      adId: settings.interstitialId,
      // The plugin's iOS `isTesting` switch replaces an explicit adId with its
      // Android sample unit. Our explicit iOS sample ID is already test-only,
      // so keep this false and control test-device initialization separately.
      isTesting: false,
    })).then(
      () => {
        if (destroyed || generation !== loadGeneration || state.privacyFormShowing || !state.canRequest) return false;
        state.ready = true;
        state.phase = "ready";
        state.lastError = "";
        state.lastErrorDetail = "";
        return true;
      },
      (error) => {
        if (!destroyed && generation === loadGeneration) {
          state.ready = false;
          state.phase = "idle";
          recordError("Interstitial ad is not available.", error);
        }
        return false;
      },
    ).finally(() => {
      if (loadAttempt === attempt) loadAttempt = null;
      state.loading = false;
      notify();
      if (!destroyed && generation !== loadGeneration && state.canRequest && !state.privacyFormShowing) {
        schedulePreload(0);
      }
    });

    attempt.availabilityPromise = withTimeout(
      nativePromise,
      settings.loadTimeoutMs,
      "Interstitial ad load timed out.",
    ).catch((error) => {
      if (!destroyed && generation === loadGeneration && !state.ready) {
        state.phase = "loading";
        recordError("Interstitial ad is not available.", error);
      }
      return false;
    });
    loadAttempt = attempt;
    return attempt.availabilityPromise;
  }

  async function showReadyInterstitial() {
    if (!state.supported || !state.initialized || !state.sdkInitialized || !state.canRequest
      || !state.ready || state.showing || state.privacyFormShowing || !isAppVisible() || destroyed) {
      return { shown: false, reason: "not-ready" };
    }

    const generation = ++showGeneration;
    state.ready = false;
    state.showing = true;
    state.phase = "showing";
    state.lastError = "";
    state.lastErrorDetail = "";
    notify();

    try {
      await withTimeout(
        plugin.setApplicationMuted({ muted: Boolean(getMuted()) }),
        1_000,
        "AdMob mute update timed out.",
      );
    } catch (error) {
      logger.warn?.("Could not pass the game's mute state to AdMob.", error);
    }

    if (!isAppVisible()) {
      state.ready = true;
      state.showing = false;
      state.phase = "ready";
      notify();
      return { shown: false, reason: "inactive" };
    }

    return new Promise((resolve) => {
      const presentTimeout = setTimer(() => {
        recordError("Interstitial ad presentation timed out.", new Error("No presentation callback received."));
        settleShow(generation, { shown: false, reason: "present-timeout" });
      }, settings.presentTimeoutMs);
      pendingShow = { generation, resolve, presentTimeout, presented: false };
      Promise.resolve().then(() => plugin.showInterstitial({ adId: settings.interstitialId })).catch((error) => {
        recordError("Interstitial ad could not be presented.", error);
        settleShow(generation, { shown: false, reason: "show-rejected" });
      });
    });
  }

  async function showPrivacyOptions() {
    if (privacyPromise) return privacyPromise;
    if (!plugin || !state.initialized || !state.privacyOptionsRequired || state.showing || pendingShow || destroyed) {
      return false;
    }

    privacyPromise = (async () => {
      state.privacyFormShowing = true;
      state.phase = "privacy";
      invalidatePreparedAd();
      let shouldPreload = false;
      try {
        await plugin.showPrivacyOptionsForm();
        await refreshConsent({ allowForm: false });
        // Never reuse an ad prepared under the previous privacy choices.
        invalidatePreparedAd();
        shouldPreload = state.canRequest && await ensureSdkInitialized();
        return true;
      } catch (error) {
        state.canRequest = false;
        state.phase = "unavailable";
        invalidatePreparedAd();
        recordError("Privacy options could not be opened.", error);
        return false;
      } finally {
        state.privacyFormShowing = false;
        state.phase = state.canRequest ? "idle" : "unavailable";
        privacyPromise = null;
        notify();
        if (shouldPreload) void preload();
      }
    })();
    return privacyPromise;
  }

  async function setMuted(muted) {
    if (!plugin || !state.sdkInitialized) return;
    try {
      await plugin.setApplicationMuted({ muted: Boolean(muted) });
    } catch (error) {
      logger.warn?.("Could not update AdMob audio state.", error);
    }
  }

  async function destroy() {
    destroyed = true;
    invalidatePreparedAd();
    if (pendingShow) settleShow(pendingShow.generation, { shown: false, reason: "destroyed" });
    await Promise.allSettled(listenerHandles.splice(0).map((handle) => handle.remove()));
  }

  notify();
  return {
    initialize,
    preload,
    showReadyInterstitial,
    showPrivacyOptions,
    setMuted,
    snapshot,
    destroy,
  };
}
