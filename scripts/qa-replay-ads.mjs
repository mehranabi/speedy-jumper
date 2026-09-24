import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createReplayAdService } from "../ads.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const events = {
  Loaded: "loaded",
  FailedToLoad: "failedToLoad",
  Showed: "showed",
  FailedToShow: "failedToShow",
  Dismissed: "dismissed",
  AdImpression: "impression",
};

function makeFakeModule({
  canRequestAds = true,
  rejectShow = false,
  neverLoad = false,
  emitShowed = true,
  emitDismissed = true,
  dismissDelayMs = 0,
  onMute = () => {},
} = {}) {
  const listeners = new Map();
  const stats = {
    initialize: 0,
    initializeOptions: null,
    prepare: 0,
    prepareOptions: null,
    show: 0,
    privacy: 0,
    mute: [],
  };
  const emit = (event, payload) => listeners.get(event)?.forEach((listener) => listener(payload));
  const plugin = {
    async initialize(options) {
      stats.initialize += 1;
      stats.initializeOptions = options;
    },
    async addListener(event, listener) {
      const callbacks = listeners.get(event) || [];
      callbacks.push(listener);
      listeners.set(event, callbacks);
      return { remove: async () => listeners.set(event, callbacks.filter((item) => item !== listener)) };
    },
    async requestConsentInfo() {
      return {
        canRequestAds,
        isConsentFormAvailable: !canRequestAds,
        privacyOptionsRequirementStatus: canRequestAds ? "REQUIRED" : "NOT_REQUIRED",
      };
    },
    async showConsentForm() {
      return {
        canRequestAds,
        isConsentFormAvailable: true,
        privacyOptionsRequirementStatus: canRequestAds ? "REQUIRED" : "NOT_REQUIRED",
      };
    },
    async showPrivacyOptionsForm() { stats.privacy += 1; },
    async prepareInterstitial(options) {
      stats.prepare += 1;
      stats.prepareOptions = options;
      if (neverLoad) return new Promise(() => {});
      queueMicrotask(() => emit(events.Loaded));
      return { adUnitId: "test-interstitial" };
    },
    async setApplicationMuted({ muted }) {
      stats.mute.push(muted);
      onMute();
    },
    async showInterstitial() {
      stats.show += 1;
      if (rejectShow) throw new Error("show rejected");
      queueMicrotask(() => {
        if (emitShowed) {
          emit(events.Showed);
          emit(events.AdImpression, {});
        }
      });
      if (emitDismissed) setTimeout(() => {
        emit(events.Dismissed);
        emit(events.Dismissed);
        emit(events.FailedToShow, new Error("late duplicate callback"));
      }, dismissDelayMs);
    },
  };
  return {
    module: {
      AdMob: plugin,
      InterstitialAdPluginEvents: events,
      // Mirrors @capacitor-community/admob 8.1.0, whose package root does
      // not export PrivacyOptionsRequirementStatus.
    },
    stats,
  };
}

async function testAdService() {
  const silentLogger = { warn() {} };
  const successful = makeFakeModule();
  const service = createReplayAdService({
    nativeIos: true,
    loadPlugin: async () => successful.module,
    logger: silentLogger,
    config: { interstitialId: "test", isTesting: true, loadTimeoutMs: 100, presentTimeoutMs: 1_000 },
  });
  await service.initialize();
  await service.preload();
  assert.equal(service.snapshot().ready, true, "interstitial should preload");
  const result = await service.showReadyInterstitial();
  assert.deepEqual(result, { shown: true, reason: "dismissed" });
  assert.equal(service.snapshot().showing, false, "dismissal should settle the gate exactly once");
  assert.equal(service.snapshot().impressions, 1, "one impression should be recorded");
  assert.deepEqual(successful.stats.mute, [false], "game mute state should be forwarded");
  assert.equal(successful.stats.initializeOptions.maxAdContentRating, "General", "ad content must be limited to general audiences");
  assert.equal(successful.stats.prepareOptions.isTesting, false,
    "the explicit iOS sample unit must not be replaced by the plugin's Android test ID");
  await service.destroy();

  const privacy = makeFakeModule();
  const privacyService = createReplayAdService({
    nativeIos: true,
    loadPlugin: async () => privacy.module,
    logger: silentLogger,
  });
  await privacyService.initialize();
  await privacyService.preload();
  assert.equal(privacyService.snapshot().ready, true);
  await Promise.all([privacyService.showPrivacyOptions(), privacyService.showPrivacyOptions()]);
  await privacyService.preload();
  assert.equal(privacy.stats.privacy, 1, "rapid privacy taps must share one native form");
  assert.equal(privacy.stats.prepare, 2, "privacy changes must replace the previously prepared ad");
  assert.equal(privacyService.snapshot().ready, true);
  await privacyService.destroy();

  const denied = makeFakeModule({ canRequestAds: false });
  const deniedService = createReplayAdService({
    nativeIos: true,
    loadPlugin: async () => denied.module,
    logger: silentLogger,
  });
  await deniedService.initialize();
  assert.equal(deniedService.snapshot().canRequest, false, "consent denial must prevent ad requests");
  assert.equal(await deniedService.preload(), false, "consent denial must fail open without loading");
  assert.equal(denied.stats.prepare, 0, "no ad request should be made without consent clearance");
  assert.equal(denied.stats.initialize, 0, "Google Mobile Ads must not initialize before consent permits requests");
  await deniedService.destroy();

  const rejected = makeFakeModule({ rejectShow: true });
  const rejectedService = createReplayAdService({
    nativeIos: true,
    loadPlugin: async () => rejected.module,
    logger: silentLogger,
  });
  await rejectedService.initialize();
  await rejectedService.preload();
  assert.deepEqual(await rejectedService.showReadyInterstitial(), { shown: false, reason: "show-rejected" });
  assert.equal(rejectedService.snapshot().showing, false, "show errors must release the gate");
  await rejectedService.destroy();

  const synchronousThrow = makeFakeModule();
  synchronousThrow.module.AdMob.showInterstitial = () => {
    throw new Error("synchronous bridge teardown");
  };
  const synchronousThrowService = createReplayAdService({
    nativeIos: true,
    loadPlugin: async () => synchronousThrow.module,
    logger: silentLogger,
  });
  await synchronousThrowService.initialize();
  await synchronousThrowService.preload();
  assert.deepEqual(
    await synchronousThrowService.showReadyInterstitial(),
    { shown: false, reason: "show-rejected" },
    "a synchronous native bridge throw must fail open",
  );
  assert.equal(synchronousThrowService.snapshot().showing, false);
  await synchronousThrowService.destroy();

  const stalled = makeFakeModule({ neverLoad: true });
  const stalledService = createReplayAdService({
    nativeIos: true,
    loadPlugin: async () => stalled.module,
    logger: silentLogger,
    config: { interstitialId: "test", isTesting: true, loadTimeoutMs: 20, presentTimeoutMs: 100 },
  });
  await stalledService.initialize();
  assert.equal(await stalledService.preload(), false, "load timeout must fail open");
  assert.equal(stalledService.snapshot().ready, false);
  await stalledService.destroy();

  const longPlayable = makeFakeModule({ dismissDelayMs: 60 });
  const longPlayableService = createReplayAdService({
    nativeIos: true,
    loadPlugin: async () => longPlayable.module,
    logger: silentLogger,
    config: { interstitialId: "test", isTesting: true, presentTimeoutMs: 20 },
  });
  await longPlayableService.initialize();
  await longPlayableService.preload();
  const longPlayableResult = longPlayableService.showReadyInterstitial();
  await delay(35);
  assert.equal(longPlayableService.snapshot().showing, true, "a presented playable must not time out underneath the native ad");
  assert.deepEqual(await longPlayableResult, { shown: true, reason: "dismissed" });
  await longPlayableService.destroy();

  const neverPresented = makeFakeModule({ emitShowed: false, emitDismissed: false });
  const neverPresentedService = createReplayAdService({
    nativeIos: true,
    loadPlugin: async () => neverPresented.module,
    logger: silentLogger,
    config: { interstitialId: "test", isTesting: true, presentTimeoutMs: 20 },
  });
  await neverPresentedService.initialize();
  await neverPresentedService.preload();
  assert.deepEqual(
    await neverPresentedService.showReadyInterstitial(),
    { shown: false, reason: "present-timeout" },
    "a native presentation that never starts must fail open",
  );
  await neverPresentedService.destroy();

  let appVisible = true;
  const backgrounded = makeFakeModule({ onMute: () => { appVisible = false; } });
  const backgroundedService = createReplayAdService({
    nativeIos: true,
    loadPlugin: async () => backgrounded.module,
    logger: silentLogger,
    isAppVisible: () => appVisible,
  });
  await backgroundedService.initialize();
  await backgroundedService.preload();
  assert.deepEqual(await backgroundedService.showReadyInterstitial(), { shown: false, reason: "inactive" });
  assert.equal(backgrounded.stats.show, 0, "an app backgrounded before presentation must not show a late ad");
  assert.equal(backgroundedService.snapshot().ready, true, "the unused ad may remain ready for a later match");
  await backgroundedService.destroy();
}

async function findOpenPort() {
  const probe = createServer();
  await new Promise((resolve, reject) => {
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", resolve);
  });
  const address = probe.address();
  assert.ok(address && typeof address === "object");
  await new Promise((resolve, reject) => probe.close((error) => error ? reject(error) : resolve()));
  return address.port;
}

async function waitForServer(origin, child) {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Server exited with ${child.exitCode}`);
    try {
      const response = await fetch(origin);
      if (response.ok) return;
    } catch {}
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${origin}`);
}

async function stopServer(child) {
  if (!child || child.exitCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([once(child, "exit"), delay(3_000)]);
  if (child.exitCode === null) child.kill("SIGKILL");
}

async function testGameReplayGate() {
  const port = await findOpenPort();
  const origin = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ["server.js"], {
    cwd: projectRoot,
    env: { ...process.env, PORT: String(port) },
    stdio: "ignore",
  });
  let browser;
  try {
    await waitForServer(origin, child);
    browser = await chromium.launch({
      headless: true,
      args: ["--use-gl=angle", "--use-angle=swiftshader"],
    });
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    await context.addInitScript(() => {
      const listeners = new Map();
      const stats = {
        initializeCount: 0,
        prepareCount: 0,
        showCount: 0,
        muteValues: [],
        consentReleased: false,
      };
      let releaseConsent;
      const consentGate = new Promise((resolve) => { releaseConsent = resolve; });
      stats.releaseConsent = () => {
        stats.consentReleased = true;
        releaseConsent();
      };
      const adEvents = {
        Loaded: "loaded",
        FailedToLoad: "failedToLoad",
        Showed: "showed",
        FailedToShow: "failedToShow",
        Dismissed: "dismissed",
        AdImpression: "impression",
      };
      const emit = (event, payload) => listeners.get(event)?.forEach((listener) => listener(payload));
      const AdMob = {
        async initialize() { stats.initializeCount += 1; },
        async addListener(event, listener) {
          const callbacks = listeners.get(event) || [];
          callbacks.push(listener);
          listeners.set(event, callbacks);
          return { remove: async () => listeners.set(event, callbacks.filter((item) => item !== listener)) };
        },
        async requestConsentInfo() {
          if (!stats.consentReleased) await consentGate;
          return {
            canRequestAds: true,
            isConsentFormAvailable: false,
            privacyOptionsRequirementStatus: "REQUIRED",
          };
        },
        async showPrivacyOptionsForm() {},
        async prepareInterstitial() {
          stats.prepareCount += 1;
          queueMicrotask(() => emit(adEvents.Loaded));
          return { adUnitId: "browser-test" };
        },
        async setApplicationMuted({ muted }) { stats.muteValues.push(muted); },
        async showInterstitial() {
          stats.showCount += 1;
          queueMicrotask(() => {
            emit(adEvents.Showed);
            emit(adEvents.AdImpression, {});
          });
          setTimeout(() => {
            emit(adEvents.Dismissed);
            emit(adEvents.Dismissed);
            emit(adEvents.FailedToShow, { message: "late duplicate" });
          }, 180);
        },
      };
      Object.defineProperty(window, "__VOID_SPHERES_ADS_TEST__", {
        value: {
          enabled: true,
          stats,
          module: {
            AdMob,
            InterstitialAdPluginEvents: adEvents,
          },
        },
        configurable: false,
      });
    });
    const page = await context.newPage();
    const errors = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(String(error)));
    await page.goto(origin, { waitUntil: "networkidle", timeout: 90_000 });
    let state = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
    assert.notEqual(state.mode, "playing", "the match must not start behind unresolved privacy UI");
    assert.equal(await page.locator("#start-button").isDisabled(), true, "Start must wait for initial UMP resolution");
    assert.equal(await page.evaluate(() => window.__VOID_SPHERES_ADS_TEST__.stats.initializeCount), 0,
      "Google Mobile Ads must not initialize before initial consent settles");
    assert.match(await page.locator('a[href^="https://void-spheres.abghari.com/support"]').getAttribute("href"), /support#report-ad/);
    await page.evaluate(() => window.__VOID_SPHERES_ADS_TEST__.stats.releaseConsent());
    try {
      await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).ads.ready, undefined, { polling: 100, timeout: 90_000 });
    } catch (error) {
      const diagnostics = await page.evaluate(() => ({
        ads: typeof window.render_game_to_text === "function"
          ? JSON.parse(window.render_game_to_text()).ads
          : null,
        stats: window.__VOID_SPHERES_ADS_TEST__?.stats || null,
      }));
      throw new Error(`Ad preload did not become ready: ${JSON.stringify({ diagnostics, errors })}`, { cause: error });
    }
    assert.equal(await page.locator("#privacy-options-button").isVisible(), true, "required privacy choices must be visible");

    await page.click("#start-button");
    await page.evaluate(() => window.advanceTime(4_200));
    assert.equal(await page.evaluate(() => window.__VOID_SPHERES_ADS_TEST__.stats.showCount), 0, "first match must start without an ad");

    await page.evaluate(() => window.advanceTime(124_000));
    state = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
    assert.equal(state.mode, "ended");
    assert.equal(state.ads.replayBlocked, true, "replay must lock while the post-match ad is pending");
    assert.equal(await page.locator("#start-button").isDisabled(), true);

    await page.dispatchEvent("#game", "mousedown", { button: 0 });
    state = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
    assert.equal(state.mode, "ended", "canvas input must not bypass the replay gate");

    await page.waitForFunction(() => window.__VOID_SPHERES_ADS_TEST__.stats.showCount === 1, undefined, { polling: 100 });
    await page.waitForFunction(() => !JSON.parse(window.render_game_to_text()).ads.replayBlocked, undefined, { polling: 100 });
    state = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
    assert.equal(state.mode, "ended", "ad dismissal should unlock replay, not auto-start it");
    assert.equal(state.ads.impressions, 1);
    assert.match(await page.locator("#ad-status").textContent(), /complete/i);
    assert.doesNotMatch(await page.locator("#overlay-note").textContent(), /unlocks when the ad break/i);
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(projectRoot, "output/web-game/ad-replay-unlocked.png") });

    await page.click("#start-button");
    await page.evaluate(() => window.advanceTime(4_200));
    state = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
    assert.equal(state.mode, "playing");

    await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).ads.ready, undefined, { polling: 100 });
    await page.evaluate(() => window.advanceTime(124_000));
    await page.waitForFunction(() => window.__VOID_SPHERES_ADS_TEST__.stats.showCount === 2, undefined, { polling: 100 });
    await page.waitForFunction(() => !JSON.parse(window.render_game_to_text()).ads.replayBlocked, undefined, { polling: 100 });
    assert.equal(await page.evaluate(() => window.__VOID_SPHERES_ADS_TEST__.stats.showCount), 2, "exactly one ad should show per completed match");
    assert.deepEqual(errors, [], "browser errors were reported");
    await context.close();
  } finally {
    await browser?.close().catch(() => {});
    await stopServer(child);
  }
}

await testAdService();
await testGameReplayGate();
console.log(JSON.stringify({ ok: true, unit: "ad lifecycle", integration: "two post-match replay gates" }));
