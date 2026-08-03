# UI Motion And Audio Stabilization Report

Phase: 8.9
Date: 2026-06-29
Branch: `codex/ui-next-level-release`

## Scope

This phase stabilized the existing motion and UI-audio layer. It did not redesign layouts, change gameplay rules, add copyrighted audio, add paid-tool dependencies, merge, push, or deploy production.

## Inspection Summary

Inspected files:

- `ui/motion/motion.css`
- `ui/motion/motion-system.js`
- `ui/sounds/ui-sound-controller.js`
- `ui/character-animation-adapter.js`
- `ui/assets/asset-manifest.js`
- `docs/UI_MOTION_SPEC.md`
- `docs/UI_SOUND_SPEC.md`
- `game.js`
- `index.html`
- `tests/game.spec.js`
- `tools/phase6_motion_audio_verification.mjs`

Existing strengths:

- `window.KaflulMotionSystem` exposes named motion events, reduced-motion handling, particle limits, and diagnostics.
- `window.KaflulUiSound` exposes mute-aware, autoplay-safe generated WebAudio events and diagnostics.
- `game.js` already routes sheets, modals, tabs, character selection, locked difficulty, HUD feedback, mission completion, and result/new-record feedback through shared hooks.
- Character animation still routes through the Phase 3 adapter and falls back to static assets when unsupported states are requested.

## Changes Made

- Added explicit `primary-play` UI sound event for the `שחק עכשיו` button.
- Added `primary-play` to the asset manifest UI sound event list.
- Added Playwright coverage for Phase 8.9 motion/audio stability.
- Updated `docs/UI_MOTION_SPEC.md`.
- Updated `docs/UI_SOUND_SPEC.md`.

No gameplay logic changed.

## Verified Motion Events

| Event | Status |
| --- | --- |
| `buttonPress` | Defined and delegated to controls. |
| `modalOpen` | Defined and used by leaderboard/pause overlays. |
| `modalClose` | Defined and used by leaderboard/pause overlays. |
| `sheetOpen` | Defined and used by menu sheets. |
| `sheetClose` | Defined and used by menu sheets. |
| `tabChange` | Defined and used by tabs/options/bottom nav feedback. |
| `characterSelect` | Defined and used by character selection. |
| `lockedFeedback` | Defined and used by locked difficulty feedback. |
| `scoreCountUp` | Defined and mapped from HUD score feedback. |
| `comboMilestone` | Defined and mapped from HUD combo feedback. |
| `missionComplete` | Defined and used by mission completion feedback. |
| `lifeLost` | Defined and mapped from HUD life-loss feedback. |
| `newRecord` | Defined and used by result/new-record feedback. |

## Verified UI Sound Events

| Event | Status |
| --- | --- |
| `buttonPress` | Generated WebAudio tone. |
| `primary-play` | Generated WebAudio tone for the main play action. |
| `panelOpen` | Generated WebAudio tone. |
| `panelClose` | Generated WebAudio tone. |
| `tabChange` | Generated WebAudio tone. |
| `characterSelected` | Generated WebAudio tone. |
| `modeSelected` | Generated WebAudio tone. |
| `difficultySelected` | Generated WebAudio tone. |
| `lockedAction` | Generated WebAudio tone. |
| `reward` | Generated WebAudio tone. |
| `newRecord` | Generated WebAudio tone. |

These sounds are temporary generated tones, not final branded audio assets.

## Character Animation Status

Current approved states:

| Character | Supported states | Adapter kind |
| --- | --- | --- |
| Bifly | `idle`, `eat` | `static-png` |
| Nabatick | `idle`, `eat` | `static-png` |

Missing approved character animation states:

- `blink`
- `tap`
- `excited`
- `worried`
- `victory`
- `defeat`
- `hit`

The project remains fully functional without paid tools. Missing complex states are documented and fall back to static approved PNGs instead of being faked through exaggerated scaling.

## Performance And Reduced Motion

Verified expectations:

- Motion uses transform and opacity-focused CSS classes.
- DOM particle emission is capped.
- Reduced motion collapses motion durations and prevents particle emission.
- Hidden-screen animations are checked by the Phase 6 verifier.
- No layout redesign was introduced.

## Tests Added

`tests/game.spec.js` now includes `phase 8.9 motion and UI audio hooks are stable`, which verifies:

- Required motion event names are registered.
- Required UI sound event names are registered.
- Every production `data-ui-sound` hook points to a real sound event.
- Autoplay blocks pre-gesture audio.
- Mute returns `reason: "muted"`.
- Menu sheet open/close motion and audio hooks work.
- Mode selection still works while the sheet closes afterward.
- Character selection motion and sound hooks work.
- Score/combo/mission/life/new-record feedback events resolve without fallback.
- Forced reduced motion blocks particles and uses a 1ms event duration.

## Verification Results

Commands run:

- `git status --short`
- `find ui/motion ui/sounds -maxdepth 2 -type f -print`
- `sed -n '1,260p' ui/motion/motion-system.js`
- `sed -n '1,260p' ui/motion/motion.css`
- `sed -n '1,320p' ui/sounds/ui-sound-controller.js`
- `sed -n '1,260p' docs/UI_MOTION_SPEC.md`
- `sed -n '1,260p' docs/UI_SOUND_SPEC.md`
- `rg -n "KaflulMotionSystem|playUiMotion|showWithMotion|hideWithMotion|kf-motion|hud-score-change|hud-combo|hud-life|mission-complete|newRecord|reward|lockedFeedback|playUiSound|KaflulUiSound|uiSound|data-ui-sound|setEnabled" game.js index.html tests tools docs ui`
- `rg -n "data-ui-sound|primary-play|uiSounds|motion" index.html ui/assets/asset-manifest.js docs/UI_SOUND_SPEC.md docs/UI_MOTION_SPEC.md tests/game.spec.js`
- `PATH=/Users/eliran/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/Users/eliran/math-pacman/node_modules/.bin:$PATH node_modules/.bin/playwright test tests/game.spec.js --grep "phase 8.9"` (first run failed because the test expected `modeSelected` to remain the last event after the sheet closed; the product behavior was correct and the test was adjusted)
- `PATH=/Users/eliran/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/Users/eliran/math-pacman/node_modules/.bin:$PATH node_modules/.bin/playwright test tests/game.spec.js --grep "phase 8.9"`
- `PATH=/Users/eliran/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/Users/eliran/math-pacman/node_modules/.bin:$PATH /Users/eliran/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --run build`
- `PATH=/Users/eliran/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/Users/eliran/math-pacman/node_modules/.bin:$PATH /Users/eliran/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --run test:node`
- `PATH=/Users/eliran/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/Users/eliran/math-pacman/node_modules/.bin:$PATH /Users/eliran/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --run test:smoke`
- `PATH=/Users/eliran/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/Users/eliran/math-pacman/node_modules/.bin:$PATH /Users/eliran/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node tools/phase6_motion_audio_verification.mjs --ci`

Results:

- Build script: passed.
- Node tests: 18 passed.
- Phase 8.9 Playwright test: passed on desktop Chromium and mobile Chromium.
- Smoke Playwright suite: 21 passed, 1 skipped.
- Phase 6 motion/audio verifier: passed on all required viewports.

Phase 6 verifier profile:

| Viewport | Avg FPS | Long frames >50ms | Particles created | Hidden animations |
| --- | ---: | ---: | ---: | ---: |
| 390x844 portrait | 114.4 | 0 | 10 | 0 |
| 430x932 portrait | 112.3 | 0 | 10 | 0 |
| 844x390 landscape | 36.8 | 3 | 10 | 0 |
| 1280x720 desktop | 71.6 | 0 | 10 | 0 |
| 1440x900 desktop | 73.1 | 0 | 10 | 0 |

Audio verification:

- Pre-gesture UI audio returned `not-unlocked` in every viewport.
- Muted UI audio returned `muted` in every viewport.
- No console/runtime errors were reported by the verifier.
- Particle count stayed within the cap.

Screenshots/report refreshed:

- `docs/phase6-screenshots/phase6-motion-audio-390x844-portrait.png`
- `docs/phase6-screenshots/phase6-motion-audio-430x932-portrait.png`
- `docs/phase6-screenshots/phase6-motion-audio-844x390-landscape.png`
- `docs/phase6-screenshots/phase6-motion-audio-1280x720-desktop.png`
- `docs/phase6-screenshots/phase6-motion-audio-1440x900-desktop.png`
- `docs/phase6-screenshots/phase6-motion-audio-report.json`

## Changed Files In This Phase

- `ui/sounds/ui-sound-controller.js`
- `ui/assets/asset-manifest.js`
- `tests/game.spec.js`
- `docs/UI_MOTION_SPEC.md`
- `docs/UI_SOUND_SPEC.md`
- `docs/UI_MOTION_AUDIO_STABILIZATION_REPORT.md`
- `docs/phase6-screenshots/phase6-motion-audio-390x844-portrait.png`
- `docs/phase6-screenshots/phase6-motion-audio-430x932-portrait.png`
- `docs/phase6-screenshots/phase6-motion-audio-844x390-landscape.png`
- `docs/phase6-screenshots/phase6-motion-audio-1280x720-desktop.png`
- `docs/phase6-screenshots/phase6-motion-audio-1440x900-desktop.png`
- `docs/phase6-screenshots/phase6-motion-audio-report.json`

## Remaining Known Limits

- UI audio is generated through WebAudio tones. No approved branded audio files are bundled.
- Gameplay sounds remain separate from UI sounds.
- Character animation remains mostly static because approved assets only cover `idle` and `eat`.
- Richer animation states should wait for approved assets or an approved pipeline.
