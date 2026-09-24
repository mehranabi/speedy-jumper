Original prompt: یک بازی سه بعدی با سرور دائمی و دو نفره بساز که با هلیکوپتر بالای سر یک maze پر پیچ و خم هستیم که سربازانی توش حرکت میکنند هم مال ما هم مال دشمن که اونم هلیکوپتر داره و باید با تیر یا دشمنان رو بزنم یا شیلد بزنیم روی یارای خودمون

Current upgrade prompt: بازی را با تمام توان از نظر مکانیک، فیزیک، گرافیک و با استفاده از تولید تصویر بهتر کن.

Current character/planet prompt: همه‌ی شخصیت‌ها را به گربه‌های چهارپا با آناتومی، فیزیک و انیمیشن دقیق تبدیل کن و سیاره‌ها را با جزئیات منظومه‌ی شمسی بازسازی کن؛ استفاده از تولید تصویر مجاز است.

## Progress

## 2026-08-02 Solo App Store & GitHub Handoff (complete)

- Current prompt: remove every online feature, prepare the complete project so `mehranabi` can ship it to the App Store, and publish the finished work to the owner's GitHub account.
- Chosen product direction: a fully offline, single-player premium-feeling arena with one human cat, one adaptive AI rival, and coordinated hostile combat cats. Internal `p1`/`p2` actor IDs stay for low-risk gameplay compatibility; all visible labels use YOU / AI.
- GitHub repository access was verified for `sobhan-dn/game`; collaborator `mehranabi` already has write permission. Work was published on `codex/solo-app-store-release` for a reviewed handoff.
- Removed the Online Duel selector, WebSocket client, hosted relay URL, random player identifier, role/spectator/presence state, remote interpolation, network message handlers, WebSocket server, `ws` dependency, and the obsolete two-client QA. The Node server is now static-only.
- Reframed the complete interface as YOU vs TACTICAL AI while preserving internal `p1`/`p2` actor IDs for safe combat compatibility. The adaptive AI rival, hostile targeting, projectiles, parries, scores, respawns, and Rift Surge all remain fully functional in solo play.
- Added `qa:solo-only`, which passed on HTTP and direct `file://` launch with an active/moving AI rival, zero WebSocket events, zero post-load gameplay requests, no legacy role/peer/ready telemetry, and no browser errors.
- Unified the public brand as `Void Spheres: Riftbound` (`Void Spheres` on the iOS home screen), replaced the incorrect Terms page with a real offline privacy policy, updated support/review/fastlane metadata, added a mandatory privacy URL, moved device requirements to `arm64`, and removed the stale Render blueprint.
- Used built-in image generation to replace the humanoid App icon with opposing quadruped cosmic cats and the default white Capacitor splash with a restrained cat/rift launch artwork. Master art is preserved under `assets/branding/`; final iOS assets were resized and visually inspected.
- Re-captured all five App Store screenshots directly from the live 430×932@3x mobile build at the required 1290×2796 size. The Solo menu, live arena, fire, Phase Dash, and planet-to-planet jump screenshots were visually inspected; a reproducible `capture:app-store` script and report were added.
- Added a GitHub Pages workflow that builds the standalone `dist` site from Node 22 after changes land on `master`; fastlane marketing/support/privacy URLs now point to the repository Pages site. Pages still needs to be enabled with GitHub Actions after the PR is merged.
- Final verification passed: all JS/MJS syntax checks, `git diff --check`, zero-vulnerability `npm audit`, desktop and mobile Solar Cats QA, deterministic combat balance (`[0,0,0]` idle deaths versus `[3,4,5]` baseline), Phase Parry, Earth→Mars long-jump transfer, standalone build, Capacitor iOS sync, and a Release iOS Simulator Xcode build with store validation.
- Published commit `5a560a0` to GitHub, opened draft PR `sobhan-dn/game#1`, and requested `mehranabi` as reviewer. TODO after merge: enable GitHub Pages with GitHub Actions and confirm the three App Store URLs return HTTP 200 before submission.

## 2026-08-02 Adaptive Combat Overhaul (complete)

- Current prompt: improve every aspect of the game, replace enemy combat logic with the strongest design, make the current difficulty easier, and add any high-impact polish needed.
- Read the required web-game workflow and audited the current solo AI, hostile archetypes, HUD, build pipeline, and deterministic QA hooks.
- Chosen combat thesis: readable skill-based pressure instead of bullet spam. An adaptive threat director will limit simultaneous attackers, telegraph attacks clearly, and ease pressure when the local cat is hurt or behind.
- Chosen recovery thesis: a regenerating Rift Guard, shard healing, longer hit/respawn protection, phase-dash projectile parries, near-miss charge, and interruptible enemy locks.
- Chosen rival thesis: the AI cat will alternate between objective hunting and player dueling using a decision state machine, imperfect aim, deliberate fire cadence, and score/health-aware aggression.
- Restored the missing root `index.html` from the last verified standalone layout and upgraded its combat HUD/menu markup for Guard, incoming-lock warnings, phase parry, and the adaptive director. The root server/build entrypoint was previously broken while `dist/index.html` remained only as an ignored artifact.
- Implemented the first complete combat pass: four starting hostiles and a four-enemy cap; attack-token coordination with one or two active attackers; score/health-aware pressure relief; longer role-specific telegraphs; line-of-sight checks; imperfect aim; post-shot recovery; and slower respawns.
- Rebuilt the solo rival as an objective-aware decision AI that alternates between hostile-cat hunting and player dueling, uses a visible aim warmup, deliberately imperfect prediction, slower low-damage shots, tactical spacing, and projectile-aware evasion.
- Added a 30-point regenerating Rift Guard, shard healing, longer hit and respawn protection, dash projectile clearing, direct Phase Parries, near-miss Rift charge, lock interruption, stagger, animated enemy deaths, contextual enemy health bars, and combat telemetry.
- Added distinct lock/parry/interrupt/guard/damage/kill sound layers with music ducking, reduced-motion-aware camera/particles/haptics, touch-specific menu labels, a mobile pause control, overlay focus/inert handling, and visible low-health danger.
- Hardened the WebSocket relay with per-message token buckets, exact payload sanitation, victim-authoritative damage validation, p1-only enemy spawns, normalized shot vectors, shot-origin checks against recent state, and optional Guard synchronization. Syntax and live two-client relay checks passed.
- `node --check` and `git diff --check` passed, and the first post-overhaul `npm run build` completed successfully, refreshing `game.bundle.js` and `dist`.
- Added a directional incoming-lock indicator, concise touch HUD labels, accessible alert semantics, hostile health feedback, and final menu/HUD documentation. The required web-game client captured a live `SCOUT LOCK` with one coordinated attacker and zero runtime errors; the screenshot and state were inspected.
- Added reproducible `npm run qa:combat-balance` coverage. Seeds 11/29/47 went from baseline deaths `[3,4,5]` to `[0,0,0]`; Guard still dropped as low as 6/7/18, all three runs regenerated Guard, enemy cap/attack slots never violated, and AI split time between objectives and player pressure.
- Verified a real hostile-projectile Phase Parry: the projectile disappeared inside the 6.5-unit window, Rift increased by 6, the parry counter incremented, dash cooldown was consumed, and health/Guard took no damage.
- Final regression passed for desktop movement/jump/dash/fire, 390×844 touch controls and layout, two-player online role/movement/gait/shot synchronization, Earth→Mars long-jump transfer, direct `file://` launch, server gzip/traversal protection, standalone build, and Capacitor iOS sync. Console/page/request error logs are empty.
- Made the online QA resilient to real network/browser startup variance by polling for synchronized velocity/gait, waiting for the game-ready hook after navigation commit, and always closing browser contexts in `finally`.
- TODO: none for this local/native upgrade. Publishing remains a separate authenticated deployment step.

## 2026-07-12 Solar Cats Upgrade (complete)

- Started the cat-anatomy, quadruped-animation, radial-physics, and Solar System planet-texture upgrade.
- Replaced both player rigs and all scout/sentinel/sniper threats with procedural quadruped combat cats. Added feline head/muzzle/ears/whiskers, articulated two-joint legs and paws, spine/landing motion, four-beat walk, diagonal trot, gallop, airborne poses, weapon recoil, and a seven-segment spring-damped tail.
- Added cat-shaped multi-sphere projectile hit volumes, cat weapon muzzle origins, lower cat-focused camera framing, and richer online animation state (velocity, grounded/dash/cooldown/platform/gait).
- Integrated generated Jupiter and Saturn 2:1 maps as optimized WebP, replaced missing-texture fallbacks with six deterministic planet-specific equirectangular surfaces, and added the Sun, axial tilts, atmospheres, Earth clouds, Saturn/Uranus rings, and signature moon systems.
- Updated the native build pipeline for the new generated planet assets; `node --check` passed for the game, cat rig, and server, and `npm run build` completed successfully.
- Used built-in image generation to create and inspect exact 2:1, full-bleed, shadowless equirectangular albedo maps for Earth, Mars, Venus, Mercury, Uranus, and Neptune; all eight planets now use generated WebP surfaces, with deterministic procedural maps retained only as load-failure fallbacks.
- Added reproducible desktop, two-client online, and 390×844 touch QA scripts. Verified idle/walk/gallop, jump rise, airborne pose, dash cooldown, synchronized remote gait/shot, firing, landing/paw contacts, all touch buttons, eight unique planet textures, and zero page/console errors.
- Final verification: every cat/planet asset returns HTTP 200, the generated planet screenshots were visually inspected in-game, `npm run qa:solar-cats`, `npm run qa:solar-cats-mobile`, `npm run qa:solar-cats-online`, `npm run build`, and `npm run ios:sync` all passed.

## 2026-07-12 Full Quality Upgrade (in progress)

- Started a full gameplay, physics, graphics, UI, audio, mobile, networking, and verification audit.
- Visual thesis: a kinetic cosmic arena of fractured living worlds, with cyan/amber player language and crimson threats.
- Interaction thesis: responsive acceleration and landing feedback, camera recoil/impact motion, and readable combat reactions.
- Generated a custom 2:1 cosmic sky panorama with the built-in image generator and saved it non-destructively as `assets/textures/cosmic-bg-v2.png` for integration.
- Rebuilt the HUD/menu hierarchy and connected explicit Solo Raid / Online Duel mode controls.
- Replaced the capsule avatars with animated procedural combat rigs, added three readable enemy archetypes with shot telegraphs, generated-sky integration, tracer projectiles, pooled impact fragments, camera recoil/shake/FOV response, damage feedback, and surface-aligned landing waves.
- Reworked movement physics with deterministic fixed-step time, stable gravity-source selection, buffered/coyote jumps, descent-only surface landing, health regeneration, phase dash, separated spawns, and a three-second countdown.
- Replaced point projectile checks with swept segment collisions and fixed the double-hit/remove path.
- Hardened the static/WebSocket server against malformed URLs, repository/dotfile exposure, oversized payloads, floods, and stale sockets; added caching and gzip for text assets.
- First full Playwright pass rendered successfully; found and fixed an unhandled pointer-lock rejection and overly lethal AI damage cadence.
- Verified with the required web-game Playwright client: buffered jump becomes airborne, grounded movement retains contact, Phase Dash consumes/recharges correctly, firing creates live projectiles, and repeated mixed-input runs report no page/console errors.
- Verified two independent browser identities enter Online Duel as `p1`/`p2`, synchronize movement, and remain ready with no errors.
- Verified iPhone portrait menu/game layouts, analog joystick movement, touch jump/dash/fire, and safe-area controls at 390×844 with no runtime errors.
- Verified timer expiry freezes the final score, match-end overlay appears, replay resets scores/time/countdown, solo pause resumes correctly, and mute state updates.
- Verified malformed URL, dotfile, and traversal requests return 400/404 without crashing the server; gzip/caching headers are present.
- Converted production textures to high-quality WebP, reduced the native web payload from roughly 48 MB to 1.6 MB, ran `npm run build`, and completed `npm run ios:sync` successfully.

## Remaining deployment note

- The upgraded local/native build is complete. Pushing it to the existing GitHub/Render deployment still requires the user's deployment/authentication step and was not performed in this task.

## 2026-07-13 High-Gravity Action Upgrade (in progress)

- Current prompt: Increase post-jump gravity substantially so cats snap back to the nearest planet; give every planet deterministic random-pattern self-rotation and translation without collisions or excessive separation; increase the overall game speed for a more action-heavy feel.
- Added centralized action tuning: faster ground/air movement, stronger dash with shorter recharge, faster player shots and cadence, faster AI movement/firing, faster hostile cat traversal/projectiles, and a quicker music pulse.
- Replaced the fixed planet oscillations with seeded multi-frequency Lissajous motion, variable self-spin, axial wobble, bounded cluster movement, ring-aware collision separation, and maximum pair-distance constraints. Seeded motion keeps the random-looking patterns reproducible.
- Airborne gravity now ramps rapidly from 96 to 158, gains distance/descent boosts, and always targets the nearest planet while airborne. Added text-state telemetry for gravity, airborne time, planet velocity, spin, motion pattern, and collision clearance.
- Verified the new feel with the required web-game Playwright client and visually inspected desktop airborne/heavy-landing, clustered-planet, mobile, and two-player screenshots.
- Measured full-speed ground movement at ~31 units/s, player shots at ~104 units/s, airborne gravity ramping past 150 and peaking around 191 with a ~0.4-second jump/return cycle, and random-pattern planet translation up to ~8 units over a minute.
- Stress-sampled planet motion for 60 seconds: ring-aware nearest clearance stayed around 2.7+ units, maximum pair spread stayed around 83 units, and peak translation speed was ~2.43 units/s with no console errors.
- Added a Player 1 authoritative planet clock for online mode so the deterministic random patterns stay aligned despite background-tab throttling. Final two-client drift was ~0.05 seconds / ~0.03 world units; remote movement and shots synchronized.
- Final verification passed: required Playwright client runs, `npm run qa:solar-cats`, `npm run qa:solar-cats-mobile`, `npm run qa:solar-cats-online`, `node --check game.js`, and `npm run build`. The first repeated online QA attempt exposed its existing key-release timing flake, and the immediate rerun passed; a separate navigation timeout also passed on rerun with the server healthy.
- TODO: none for this local gameplay upgrade. Deployment remains a separate authenticated step.

## 2026-07-14 Direct HTML Launch Fix (complete)

- Reproduced the root `index.html` failure under `file://`: the browser blocked the ES module `game.js` with a null-origin CORS error. The previous bundled `dist/index.html` started, but every external WebP texture was still blocked under `file://`.
- Updated the build to generate a classic 3.6 MB `game.bundle.js` that embeds Three.js, the combat-cat rig, and all nine production planet/sky WebP assets as data URLs.
- Updated root and built `index.html` to load the standalone bundle, and allowed `game.bundle.js` through the local HTTP server. Direct double-click and HTTP launch now share the same tested build.
- Verified direct `file://` launch with the required web-game Playwright client through start, movement, jump, fire, and gameplay screenshot inspection. A separate direct-file console audit reported zero errors, eight planets, and an active cat player.
- Verified HTTP responses for both `/` and `/game.bundle.js` return 200 and visually inspected the bundled HTTP gameplay screenshot. `npm run build` and the full `npm run qa:solar-cats` control suite pass.
- TODO: rerun `npm run build` after future source or texture changes so `game.bundle.js` stays current.

- Replaced the previous flash-card app with a Three.js helicopter maze game.
- Added a Node HTTP + WebSocket server for two-player realtime state.
- Added local fallback mode if the WebSocket server is not running.

## Verification Notes

- Installed npm dependencies and Playwright Chromium.
- Ran the server at http://localhost:5173.
- Verified gameplay with the develop-web-game Playwright client after joining the blue team.
- Verified two simultaneous browser pages joining blue/red, no console errors, synchronized helicopters/soldiers, and visible shield effect.
- Added and smoke-tested mobile touch controls for iPhone viewport.
- Reduced realtime network load: client input is throttled, server snapshots are smaller and sent at 20Hz, remote motion is interpolated, and WebSocket ping/pong cleanup was added.
- Added `render.yaml` for deploying to a real WebSocket-capable server on Render.
- Pushed the deploy-ready game to GitHub repo `sobhan-dn/game` on `master` via GitHub connector commit `9d83140b49123576ed42abe32ecb766ff466d036`.
- Attempted Render CLI login; blocked because Safari/Render requires GitHub credentials or Render account authorization.

## TODO

- Complete Render authentication, then deploy `https://github.com/sobhan-dn/game` using the included `render.yaml`.

## 2026-07-14 Long-Jump, Spawn Contact, and Music Upgrade (complete)

- Current prompt: make jumps taller/longer for easier planet-to-planet traversal, stop the cat sinking into its starting planet, and add a stronger background track.
- Raised player launch speed from 29 to 46 and replaced the immediate heavy return-gravity ramp with a 0.62-second 50→112 ramp plus softer distance/descent boosts, giving substantially more airtime and traversal range.
- Added a shared 1.02-unit feline surface offset and a grounded-player platform anchor. Cats now follow translating planets during the menu, countdown, pause, and end states instead of being left behind while the planet moves through them.
- Replaced the simple tone loop with a compressed procedural synthwave soundtrack containing sequenced drums, filtered bass, arpeggios, and evolving minor pads; music now starts during the opening countdown and safely resets its transport on a new match.
- Added jump-profile, exact surface-offset, and audio-style/playing telemetry to `render_game_to_text` for deterministic QA.
- Added `scripts/qa-long-jump.mjs` and `npm run qa:long-jump`. Deterministic verification measured roughly 12.2 units of jump clearance and 0.93–0.95 seconds of airtime, then confirmed a real Earth→Mars transfer, exact grounded contact, active soundtrack telemetry, and zero console/page errors.
- Ran the required web-game Playwright client for countdown contact, long-jump transfer, and landing states and visually inspected the screenshots. The cat's paws remain above/on the planet surface at startup, the airborne pose reads clearly, and the landing effect aligns with the destination world.
- Regression verification passed for desktop controls/combat, 390×844 touch controls, and two-player online state/shot synchronization. Visually inspected the latest desktop, mobile, and online gameplay screenshots.
- Rebuilt `game.bundle.js` and `dist`, passed `node --check`, and reran the long-jump QA directly against `file://index.html`; the standalone double-click build also transferred Earth→Mars with zero errors.
- TODO: none for this local gameplay upgrade. Deployment remains a separate authenticated step.

## 2026-05-16 Replacement

- Replaced the deployed game content with the `Void Spheres` game from `/Users/sobhan/Desktop/hi/هار هار/ظلام`.
- Swapped the old WebSocket server for a small static Node server because the new game is standalone.
- Added iPhone-friendly touch controls: left joystick for movement, right-side look area, jump and fire buttons.
- Added `window.render_game_to_text` and `window.advanceTime` for automated web-game verification.
- Verified locally on `http://localhost:5174` with desktop Playwright game actions and an iPhone 14 Playwright smoke test.

## TODO

- Push the replacement to `sobhan-dn/game` on `master` and confirm Render auto-deploy goes live.

## 2026-05-16 Online Duel Upgrade

- Kept the provided texture atlas and panorama assets in `assets/textures`; their hashes match the user-provided images.
- Upgraded `Void Spheres` into an online two-player competitive duel: first browser becomes player 1, second browser becomes player 2, additional browsers become spectators.
- Added a WebSocket relay to the Node server for player state, shots, damage, enemy removals, scoring, and restarts.
- Updated the HUD and overlay for two player health bars, scores, online role status, and duel controls.
- Strengthened player/enemy visuals with distinct player tints, brighter projectiles, score feedback, and retained animated FBX character support.
- Verified locally with two simultaneous Playwright browser pages: both received separate online roles, started the game, moved independently, and produced no console/page errors.

## 2026-05-16 English Timed Duel Update

- Converted the game UI and runtime messages to English for a store-ready build.
- Added a 120-second round timer. The match ends only when time expires, then highest score wins.
- Updated scoring: destroying a red unit gives 1 point, and every successful online rival hit gives 1 point.
- Player death no longer ends the match; the player respawns after a short delay so the two-minute round keeps flowing.
- Added random red-unit respawns when the active red count drops below five, with Player 1 acting as the online spawn authority.
- Tuned the music loop to speed up in the final 30 seconds and added small haptic pulses on mobile for hits/kills.
- Optimized the iPhone viewport: English safe-area metadata, compact HUD/menu styles, larger touch controls, right-side touch look, and no external web font dependency.
- Verified desktop gameplay with the develop-web-game Playwright client and visually inspected `output/web-game/shot-0.png`.
- Verified iPhone menu and gameplay screenshots at `output/web-game/iphone-menu.png` and `output/web-game/iphone-game.png`; start button is visible and the game starts with no JS console errors.
- Verified timer expiry via `window.advanceTime(121000)`, ending with `Time is up. Draw. Final score 0-0`.

## TODO

- After GitHub connector deploy, verify the Render URL serves the updated English timed build and no longer logs missing texture 404s on Render.
- Updated Render/GitHub deployment files through the GitHub connector: English compact `index.html`, iPhone compact `styles.css`, and `server.js` runtime patches for the deployed compact game bundle.

## 2026-05-20 iPhone Role/Touch Check

- Added a persistent browser `playerId` so the server only assigns Player 1 blue and Player 2 yellow to two different browser identities; duplicate connections from the same browser become spectators.
- Extended the server runtime patch so the currently deployed compact bundle can also pass `playerId` through the WebSocket URL after deploy.
- Verified the current Render URL with an iPhone 14 Playwright context: with a first desktop player already connected, the iPhone page joined as `p2`, showed the yellow player, and joystick drag moved the player by about 18 world units.
- Verified the local updated build with an iPhone 14 Playwright context: second player joined as `p2`, yellow HUD/character rendered, joystick drag moved the player by about 16 world units, and no console/page errors were reported.

## TODO

- Push/deploy the local `game.js`, `index.html`, and `server.js` changes to GitHub/Render so the permanent URL gets the latest blue/yellow identity fix.

## 2026-07-14 Camera Overview and Audio Unlock (complete)

- Current prompt: move the camera farther back for better environmental awareness and fix background music not playing.
- Increased the follow-camera distance, height, and base field of view on desktop and touch layouts while preserving aim direction, collision avoidance, recoil, and speed FOV effects.
- Moved Web Audio unlocking into the capture phase of real pointer/key gestures, added an iOS/Safari silent-buffer primer, truthful context-state telemetry, safe resume handling, and a stronger music mix.
- Added camera distance/tuning and audio unlock/scheduling telemetry to `render_game_to_text` for deterministic QA.
- Visual QA found that the wider camera could be obscured by Saturn/Uranus ring planes; rings now smoothly fade only while intersecting the player-to-camera sight corridor.
- Verified desktop camera distance around 16 world units at a 70-degree base FOV, active Web Audio (`running`, `unlocked`, primed, and scheduling steps), mute/unmute restoration, direct `file://` audio, and zero console/page errors.
- Passed the required web-game Playwright client, `npm run qa:solar-cats`, `npm run qa:solar-cats-mobile`, and `npm run qa:long-jump`; visually inspected desktop movement/airborne/fire, mobile gameplay, normal wide-camera, and ring-fade screenshots.
- Rebuilt `game.bundle.js`/`dist` and synchronized the finished web assets into the Capacitor iOS project.
- TODO: none for this local camera/audio change. Deployment remains a separate authenticated step.

## 2026-05-25 iPhone App Store Packaging

- Added Capacitor 8 iOS packaging with bundle id `com.sobhandn.voidspheres` and scripts for `npm run build`, `npm run ios:sync`, and `npm run ios:open`.
- Added a clean `dist/` web export pipeline and synced the web bundle into `ios/App/App/public` for the native WebView.
- Updated the game runtime so native iOS (`voidspheres:` / `capacitor:`) connects to the hosted WebSocket server instead of trying `localhost`.
- Tuned iPhone rendering: lower mobile pixel ratio cap, high-performance WebGL preference, mobile antialias reduction, safe-area sizing, disabled text callouts/tap highlights, and more compact portrait HUD.
- Added native App Store readiness metadata: fullscreen iPhone target, hidden status bar, encryption export flag, and `PrivacyInfo.xcprivacy`.
- Verified `npm run ios:sync`, `xcodebuild -resolvePackageDependencies`, and `xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug -destination 'platform=iOS Simulator,name=iPhone 17' build`.
- Installed and launched the built app on the iPhone 17 simulator and captured `output/web-game/native-ios-after-load.png`.
- Verified two-client local gameplay with an iPhone Playwright context; Player 1 and Player 2 entered `playing`, `peer: true`, `ready: true`, with no console/page errors.

## TODO

- In Xcode, set the real Apple Developer Team/signing profile and archive a Release build for App Store Connect.
- Confirm the hosted WebSocket URL `wss://maze-heli-command.onrender.com` is the production server you want before review.

## 2026-05-20 Role Lock And Start Gate

- Added a start gate: the match does not enter `playing` until both Player 1 blue and Player 2 yellow are online.
- Added stable server role slots: a connected yellow player does not get promoted to blue if blue disconnects; a new different player fills the freed blue slot.
- Tightened duplicate identity handling: a second connection with the same `playerId` is a spectator, not another blue/yellow controller.
- Verified locally against the Render-target compact build: one-player start stayed in menu with `Waiting for second player`; two-player start entered playing; iPhone Player 2 joystick moved the yellow character while Player 1 stayed separate.

## 2026-08-16 Post-match AdMob replay gate (implementation complete)

- Current prompt: find Mehran's earlier Google Ads integration, preserve the current game exactly, avoid the Unreal/older game versions, and require an ad break after each completed match before replay.
- Located Mehran's verified source commit `26022c85930839115abc7cb8c92ac8a8d83e0df8` in this repository's `origin/master` history. Ported only its Capacitor AdMob/UMP foundation; no older gameplay, domain, publisher account, Cloudflare setup, or Unreal files were copied.
- Added `@capacitor-community/admob` 8.1.0, Google Mobile Ads 13.6.0, UMP 3.1.0, current Google-listed SKAdNetwork identifiers, General-audience ad filtering, privacy controls, and an in-app Report Ad route.
- Implemented one standard interstitial at the natural post-match break. The first match and browser preview stay ad-free; the next match unlocks only after a ready ad is dismissed. Consent denial, offline/no-fill, stale or unavailable ads, initialization/load/show errors, app backgrounding, and timeouts fail open so gameplay cannot become permanently blocked.
- Serialized UMP and interstitial presentation, blocked initial Start until mandatory privacy UI settles, invalidated cached ads after privacy changes, scoped native load attempts to consent generations, prevented late-pop ads, preserved mute/audio state, and centralized the replay guard in `startGame()` so alternate input paths cannot bypass it.
- Added deterministic unit/browser QA for initial consent, double-tap privacy, two consecutive post-match gates, bypass prevention, stale-ad replacement, long playable ads, native presentation timeout, backgrounding, duplicate callbacks, and consent/no-fill failures. Also passed Solo, desktop, mobile, long-jump, the required web-game Playwright client, dependency audit, plist validation, Capacitor sync, and native iOS Simulator compilation.
- Development intentionally uses Google's official sample App ID and interstitial ID. `npm run ios:release:prepare` is a production guard and currently fails as designed until the app owner's production AdMob App ID/ad-unit ID replace the samples and testing mode is disabled.
- Release TODO: obtain the owner's production AdMob identifiers; confirm AdMob audience/message settings and App Store privacy answers; then run the release guard and test on a signed physical iPhone. Do not use Mehran's publisher ID without verified ownership.
  - Update 2026-09-07: the app's AdMob listing is already verified via `app-ads.txt` on the production site — this is no longer outstanding. See the 2026-09-07 entry below for the current, verified live URLs.

## 2026-09-07 Version 3.2 TestFlight Prep and Stale Docs Cleanup

- Bumped the app to version 3.2 (build 7), rebuilt/synced the native iOS payload, archived it, and pushed the version-bump commit to `origin/master`.
- Fixed a stale-`node_modules` drift caught during the archive: `@capacitor-community/admob` was locally installed at 8.0.1 against a committed lockfile of 8.1.0, which silently pulled Google Mobile Ads 12.14.0 instead of the intended 13.6.0 into the Xcode Swift package resolution. Ran `npm ci` and re-archived with the correct SDK version.
- Confirmed via App Store Connect (Apple ID `6774966205`, bundle `com.syd-sbn.voidspheres`) that the actual submitted URLs are `https://void-spheres.abghari.com` (marketing), `https://void-spheres.abghari.com/support` (support), and `https://void-spheres.abghari.com/privacy-policy` (privacy) — hosted from the separate Vercel project [`mehranabi/speedy-jumper-website`](https://github.com/mehranabi/speedy-jumper-website), not this repo's GitHub Pages preview.
- Found and fixed stale `sobhan-dn.github.io` URL references left over from a merge (`52998f9`) that had discarded an earlier domain migration (`b89c913`, since-removed `cloudflare/` files): updated `fastlane/metadata/en-US/{marketing,support,privacy}_url.txt`, `README.md`, and `marketing/app-store-release-plan.md` to point at the real, currently-submitted `void-spheres.abghari.com` URLs, and clarified that the GitHub Pages workflow only builds an optional separate ad-free browser preview.
- Confirmed with the app owner that the AdMob listing for this app is already verified in the Google AdMob console via `app-ads.txt` on the production site, so no `app-ads.txt`/domain-verification work is outstanding — only swapping in the real (non-sample) AdMob App ID/interstitial unit and updating the App Store Connect App Privacy answers (still "Data Not Collected") remain before a production ad rollout.
- Per the app owner's direction, this repo now stays game-code-only: removed the GitHub Actions workflow (`.github/workflows/pages.yml`) and its GitHub Pages preview entirely, deleted the bundled `support.html`/`privacy.html`/`privacy-policy.html` pages, their zipped copies, and the `marketing/privacy-policy.md`/`support-page.md` drafts, and stopped `scripts/build-ios-web.mjs`/`server.js` from referencing them. The in-game "Report Ad" link now opens `https://void-spheres.abghari.com/support#report-ad` directly instead of a locally bundled copy. All support/privacy/marketing page content and hosting now lives solely in the separate `mehranabi/speedy-jumper-website` Vercel repo.

## 2026-09-07 Production AdMob App ID

- Set the app owner's real AdMob App ID, `ca-app-pub-1684528554830333~7667706174`, as `GADApplicationIdentifier` in `ios/App/App/Info.plist`, replacing Google's sample App ID.
- `ads.js` still uses Google's sample interstitial ad unit with `isTesting: true`; the app owner will provide a production interstitial ad unit ID for this app in a follow-up.
- Per the app owner's request, deleted `scripts/validate-ad-config.mjs` and the `validate:ads`, `validate:ads:production`, and `ios:release:prepare` npm scripts that guarded against archiving with sample AdMob identifiers or `isTesting: true` still enabled. There is no longer an automated check blocking a production archive while `ads.js` still points at the sample interstitial — updated `README.md` and `marketing/app-store-release-plan.md` to describe the manual steps (swap the interstitial ID, set `isTesting: false`, then `npm run ios:sync`) in its place.

## 2026-09-07 Production Interstitial and Version 3.3 TestFlight Prep

- Set the app owner's production interstitial ad unit ID, `ca-app-pub-1684528554830333/7866864766`, in `ads.js`, replacing Google's sample interstitial, and set `isTesting: false`. The app now runs on fully production AdMob identifiers (App ID set earlier the same day, interstitial set now) — this is the first build shipping real, revenue-generating ads.
- Verified the built bundle (`dist/game.bundle.js`) contains the production ad unit ID and `isTesting:!1` (minified `false`) before archiving.
- Bumped the app to version 3.3 (build 8), rebuilt/synced the native iOS payload, and archived it for TestFlight.
- Outstanding before a public App Store submission (not TestFlight): the App Store Connect App Privacy answers still say "Data Not Collected" and need updating to reflect AdMob's actual data collection now that real ads are live.

## 2026-09-24 Firebase Analytics

- Added `@capacitor-firebase/analytics` 8.5.2 (Firebase iOS SDK 12.x via SPM) and the Firebase project `speedy-jumper-f2a2c` config at `ios/App/App/GoogleService-Info.plist` (added to the App target's resources). The plugin configures Firebase itself on load, so `AppDelegate.swift` is unchanged.
- Bumped Capacitor core/ios/cli to 8.5.2: the plugin's SPM `packageOptions.symlink` setting (avoids a SwiftPM package-identity collision) needs CLI 8.4.0+. `npx cap sync` now generates `ios/App/CapApp-SPM/symlinks/`, which is gitignored.
- Uses the `AnalyticsWithoutAdIdSupport` trait (no IDFA; the app shows no ATT prompt) and sets Info.plist consent-mode defaults `GOOGLE_ANALYTICS_DEFAULT_ALLOW_AD_STORAGE`/`AD_USER_DATA`/`AD_PERSONALIZATION_SIGNALS` to false, so Analytics is used for product analytics only.
- `analytics.js` registers the native plugin without a web implementation, so the browser preview stays analytics-free and the Firebase JS SDK is not bundled. Events: `level_start`, `level_end` (result, score, opponent_score, coins_earned, best_streak), and `post_match_ad` (outcome, ad_phase, ad_error — the native AdMob error text, now kept in the ad state as `lastErrorDetail`).
- Outstanding: App Store Connect App Privacy answers must declare Analytics data collection (Product Interaction, Device ID/app instance ID, not linked to identity, not used for tracking).

## 2026-09-24 Firebase Crashlytics and Performance, AdMob init fix

- Added `@capacitor-firebase/crashlytics` and `@capacitor-firebase/performance` 8.5.2 (SPM, symlinked like Analytics). `AppDelegate` now calls `FirebaseApp.configure()` in `didFinishLaunching` so Crashlytics and the Performance app-start trace start before any plugin loads.
- Added an "Upload Crashlytics dSYMs" run-script build phase (last phase of the App target, SPM script path and Firebase's documented input files). Release already uses `dwarf-with-dsym`; Debug stays `dwarf`, so only Release/archives upload symbols.
- New `monitoring.js`: uncaught JS errors and unhandled rejections become Crashlytics non-fatals (each distinct message once, at most 20 per session); custom Performance traces `game_boot` (script start to first rendered frame) and `solo_match` (metrics `frames`, `slow_frames` > 33 ms, `avg_fps`).
- Crashlytics logs "non-Crashlytics handler (GADRegisterSignalHandlers)" at launch: Google Mobile Ads installs its own signal handlers after Firebase configures. Verify with a test crash on a physical device.
- **Root cause of "Ad unavailable":** `@capacitor-community/admob` 8.1.0 does not export `PrivacyOptionsRequirementStatus` from its package root, so `ads.js` threw "AdMob plugin exports are unavailable" on every native launch and never reached AdMob. `ads.js` now falls back to the native `"REQUIRED"` string, and the QA mocks no longer provide the export, so the regression is covered.
- **Second blocker (AdMob console, not code):** UMP returns "no form(s) configured for the input app ID" for `ca-app-pub-1684528554830333~7667706174`. A consent message (GDPR, and optionally US state regulations) must be created and published under AdMob → Privacy & messaging for this app; until then consent never settles and no ads are requested.

## 2026-09-24 Version 3.4 (9) Release Prep

- Bumped `MARKETING_VERSION`/`CURRENT_PROJECT_VERSION` to 3.4 (9) and `package.json` to 3.4.0. This build ships Firebase Analytics, Crashlytics and Performance (#2, #3), the AdMob init fix (#3), and the triple-press ad error reveal (#4).
- Rebuilt `game.bundle.js` and ran `npx cap sync ios`; verified the production interstitial unit and `isTesting:false` in the synced bundle, and a Release `generic/platform=iOS` build succeeds (Crashlytics dSYM validation passes). The app owner archives and uploads from Xcode.
- Still outstanding: publish a UMP consent message in AdMob → Privacy & messaging for this app (otherwise ads stay unavailable), and update the App Store Connect App Privacy answers for Firebase data collection before a public App Store submission.

## 2026-09-24 Launch crash fix: adopt the UIScene life cycle

- **Symptom:** TestFlight build 3.4 (9) crashes immediately on launch.
- **Root cause:** apps built with the iOS 27 SDK (Xcode 27) must use the UIKit scene life cycle; UIKit refuses to launch an app whose Info.plist has no `UIApplicationSceneManifest` and whose app delegate does not implement `application(_:configurationForConnecting:options:)` ("UIScene life cycle is required for apps built with this SDK"). The project still used the legacy `UIMainStoryboardFile` + `AppDelegate.window` setup. Capacitor 8.5 (bumped to 8.5.2 in #2) adopts UIScene and prints "Capacitor 8.5 adopts UIScene on iOS" during `cap migrate`, but that native migration was never applied. 3.3 (8) was archived on 2026-09-07, before Xcode 27.
- **Fix (mirrors Capacitor 8.5's iOS template):** added `SceneDelegate.swift` (creates the window and `CAPBridgeViewController`, forwards URL/user-activity events to `SceneDelegateProxy`), `configurationForConnecting` in `AppDelegate`, and a single-scene `UIApplicationSceneManifest` in Info.plist. Unlike the template, the scene config has no `UISceneStoryboardFile` and `UIMainStoryboardFile` is removed, so only one bridge/WebView is ever created. `FirebaseApp.configure()` still runs in `didFinishLaunching`, before the scene connects and plugins load.
- Not verifiable in this Linux environment: needs an Xcode 27 build and launch on a device/simulator before re-uploading. Bump the build number (e.g. 3.4 (10)) for the new TestFlight upload.
