# Kaflul UI Next Level - Phase 0 Audit

Date: 2026-06-28
Scope: Phase 0 investigation and documentation only.

No production HTML, CSS, JavaScript, assets, gameplay logic, save behavior, or deployment settings were intentionally changed during this audit.

## Baseline Evidence

Baseline home-screen screenshots were captured from the current repository through a temporary local static server and headless Chrome.

| Viewport | File |
| --- | --- |
| 390x844 portrait | `docs/baseline-screenshots/phase0-home-390x844-portrait.png` |
| 430x932 portrait | `docs/baseline-screenshots/phase0-home-430x932-portrait.png` |
| 844x390 landscape | `docs/baseline-screenshots/phase0-home-844x390-landscape.png` |
| 1280x720 desktop | `docs/baseline-screenshots/phase0-home-1280x720-desktop.png` |
| 1440x900 desktop | `docs/baseline-screenshots/phase0-home-1440x900-desktop.png` |
| Browser/layout report | `docs/baseline-screenshots/phase0-baseline-report.json` |

Capture metadata:

- Browser: Chrome/149.0.7827.197
- Local URL: `http://127.0.0.1:4180/`
- Console/runtime events during baseline load: 0
- Runtime errors collected by `window.__mathMazeRuntime.errors`: 0
- Document overflow at all five required viewports: none detected

## Repository Structure

Kaflul is a root-level static web game deployed to Vercel. Production files are currently flat at repository root rather than grouped under `src`.

Primary areas:

- `index.html`: full app shell, start menu, dialogs, HUD, canvas, script/style order.
- `game.js`: main game state, rendering, input, scoring flow, menu state sync, dialogs, leaderboard publishing.
- `kaflul-systems.js`: reusable systems for difficulty, scoring, leaderboard, persistence, state machine, swipe detection.
- `api/champions.js`: Vercel serverless endpoint for remote champion data.
- CSS layers: `styles.css`, mobile hotfix CSS, `leaderboard.css`, `arcade-foundation.css`, `main-menu.css`.
- Mobile runtime helpers: `mobile-enhancements.js`, `mobile-screen-state.js`, `mobile-question-state.js`, `mobile-native-answer.js`.
- Asset helpers: `poster-loader.js`, `nabatick-directional.js`, `maze-enhancements.js`.
- Assets: current logo, poster/background, Bifly sprites, Nabatick reference sprites, dark enemies, older Nabatick fallback/vector files.
- Tests: `tests/kaflul-systems.test.js`, `tests/game.spec.js`, `playwright.config.js`.
- Automation/tools: `.github/workflows/*`, `tools/*.py`.
- Docs: this Phase 0 documentation set plus `docs/UI_NEXT_LEVEL_MASTER_SPEC.md`.

## Current HTML Hierarchy

`index.html` is a single-page document with `lang="he"` and `dir="rtl"`.

Top-level hierarchy:

- `body`
- `.game-shell`
- `.hud`: gameplay metrics and icon buttons.
- `.stage`
- `canvas#game-canvas`: gameplay surface, fixed intrinsic size `960x720`.
- `#question-dialog.dialog`: multiplication question modal.
- `#start-screen.screen`: main menu wrapper.
- `form#player-form.main-menu`: current home menu.
- `.menu-world`: decorative background enemies/particles.
- `.menu-topbar`: best-score card, logo, action buttons.
- `.menu-hero`: character selection radio cards for Bifly and Nabatick.
- `.menu-leaderboard-card`: local rank preview.
- `.menu-cta`: start button and selection summary.
- `.menu-control-strip`: mode, difficulty, profile/settings controls.
- `#mode-panel.menu-sheet`: arcade/adventure selection dialog.
- `#difficulty-panel.menu-sheet`: five-level difficulty dialog.
- `#settings-panel.menu-sheet`: nickname/settings dialog.
- `#end-screen.screen`: results screen.
- `#leaderboard-dialog.leaderboard-dialog`: leaderboard modal with filters.

Important detail: the start menu and gameplay canvas are both present at load. CSS and JS decide visibility by `hidden`, classes, and root data attributes.

## CSS Dependency And Override Map

Stylesheet load order in `index.html` is the effective cascade order:

| Order | File | Lines | Role | Risk |
| --- | ---: | ---: | --- | --- |
| 1 | `styles.css?v=20260619-6` | 1408 | Base shell, HUD, canvas, dialogs, legacy start/results styles, responsive base. | High, broad global selectors. |
| 2 | `mobile-enhancements.css?v=20260621-1` | 726 | Touch/mobile control layout, joystick, phone/landscape adaptations. | High, overrides HUD/stage/dialog behavior. |
| 3 | `mobile-phone-refinement.css?v=20260621-2` | 259 | Phone portrait refinements. | Medium, overlaps other mobile files. |
| 4 | `mobile-start-hotfix.css?v=20260621-4` | 228 | Start-screen phone hotfix. | Medium, start-screen-only overrides. |
| 5 | `mobile-resolution-hotfix.css?v=20260621-5` | 133 | Resolution/scale fixes. | Medium, opacity/pointer behavior. |
| 6 | `mobile-native-answer.css?v=20260621-6` | 108 | Native answer input behavior. | Medium, modal/mobile interaction. |
| 7 | `mobile-final-layout.css?v=20260621-7` | 110 | Late mobile layout override. | High, 16 `!important` rules. |
| 8 | `leaderboard.css?v=20260622-1` | 278 | Leaderboard dialog and buttons. | Medium, global button class overlap. |
| 9 | `arcade-foundation.css?v=20260627-1` | 424 | Arcade shell/HUD/state polish. | High, game-state and HUD overrides. |
| 10 | `main-menu.css?v=20260628-3` | 1572 | Current main menu redesign. | Very high, final cascade authority for menu. |

CSS count summary:

| File | `!important` | `@media` | `@keyframes` |
| --- | ---: | ---: | ---: |
| `styles.css` | 5 | 7 | 4 |
| `mobile-enhancements.css` | 3 | 5 | 0 |
| `mobile-phone-refinement.css` | 4 | 2 | 0 |
| `mobile-start-hotfix.css` | 1 | 2 | 0 |
| `mobile-resolution-hotfix.css` | 0 | 2 | 0 |
| `mobile-native-answer.css` | 2 | 2 | 0 |
| `mobile-final-layout.css` | 16 | 2 | 0 |
| `leaderboard.css` | 3 | 1 | 0 |
| `arcade-foundation.css` | 6 | 3 | 0 |
| `main-menu.css` | 11 | 7 | 3 |

High-conflict selector families:

- `#start-screen`, `.screen`, `.dialog`, `.hud`, `.stage`, `#game-canvas`.
- `.leaderboard-open-button`, `.leaderboard-dialog`, `.leaderboard-panel`.
- `.menu-character`, `.character-option`, `.character-card`, `.difficulty-options`, `.mode-options`.
- `html.start-screen-open`, `html.question-open`, `html[data-game-state]`.
- Mobile control classes such as `.mobile-joystick`, `.touch-layout`, `.supplementary-mobile-controls`.

## Responsive Breakpoints

All detected responsive conditions:

| File | Breakpoints/media conditions |
| --- | --- |
| `styles.css` | `max-height: 820px`, `max-height: 620px`, `(hover: none), (pointer: coarse)`, `max-width: 760px`, `max-width: 760px and max-height: 560px`, `prefers-reduced-motion: reduce`, `pointer: coarse`. |
| `mobile-enhancements.css` | `(hover: none), (pointer: coarse)`, `max-width: 600px and orientation: portrait`, same plus `max-height: 700px`, `pointer: coarse and min-width: 601px and orientation: portrait`, `prefers-reduced-motion: reduce`. |
| `mobile-phone-refinement.css` | `max-width: 600px and orientation: portrait`, same plus `max-height: 720px`. |
| `mobile-start-hotfix.css` | `max-width: 600px and orientation: portrait`, same plus `max-height: 740px`. |
| `mobile-resolution-hotfix.css` | `max-width: 600px and orientation: portrait`, `max-width: 380px and orientation: portrait`. |
| `mobile-native-answer.css` | `max-width: 600px and orientation: portrait`, `max-width: 380px and orientation: portrait`. |
| `mobile-final-layout.css` | `max-width: 600px and orientation: portrait`, same plus `max-height: 720px`. |
| `leaderboard.css` | `max-width: 600px`. |
| `arcade-foundation.css` | `max-width: 820px`, `max-width: 600px`, `orientation: landscape and max-height: 520px`. |
| `main-menu.css` | `max-width: 1180px`, `max-width: 760px and orientation: portrait`, same plus `max-height: 700px`, `max-width: 900px and orientation: landscape`, `(hover: none), (pointer: coarse)`, `max-width: 900px`, `prefers-reduced-motion: reduce`. |

The current responsive model is additive and patch-based. Phone portrait is affected by at least six CSS files before `main-menu.css`, so a future visual overhaul should first introduce clear ownership boundaries.

## Mobile-Specific Hotfix Files

Loaded mobile CSS:

- `mobile-enhancements.css`: broad touch and mobile layout layer.
- `mobile-phone-refinement.css`: phone portrait refinement.
- `mobile-start-hotfix.css`: start-screen phone fixes.
- `mobile-resolution-hotfix.css`: resolution and question-state adjustments.
- `mobile-native-answer.css`: mobile input behavior.
- `mobile-final-layout.css`: late layout override with many `!important` rules.

Loaded mobile JS:

- `mobile-enhancements.js`: touch detection, fullscreen button injection, viewport height sync, mobile labels.
- `mobile-screen-state.js`: toggles `supplementary-mobile-controls` based on start screen and pointer type.
- `mobile-question-state.js`: toggles `question-open` while question dialog is visible.
- `mobile-native-answer.js`: keeps the answer input as a native numeric field.

Present but not loaded in `index.html`:

- `mobile-camera-fit-runtime.js`
- `mobile-runtime-loader-note.txt`
- Several mobile fix `.md` notes

These are candidates for Phase 1 inventory cleanup, not deletion yet.

## UI-Related JavaScript State Handling

Core state lives in `game.js`:

- Character: `state.characterId`, `PLAYER_CHARACTERS`, `setCharacter`, `characterLabel`.
- Mode: `state.modeId`, `setMode`, radio inputs named `game-mode`.
- Difficulty: `state.difficultyId`, `setDifficulty`, `syncDifficultyInputs`.
- Persistence: `CONFIG.storageKeys`, `SYSTEMS.loadSave`, `persistSave`, `state.save.settings`.
- Root UI state: `document.documentElement.dataset.character`, `data-game-state`, `start-screen-open`, `question-open`.
- Menu syncing: `syncMenuSummary`, `updateMenuModeControl`, `updateMenuDifficultyControl`, `updateMenuLeaderboardPreview`.
- Sheets: `openMenuSheet`, `closeMenuSheets`, `aria-expanded`, `hidden`.
- Gameplay flow: `startGame`, `showStartScreen`, `togglePause`, `askQuestion`, `finishQuestion`, `showEndScreen`.
- Leaderboard: `openLeaderboard`, `closeLeaderboard`, `loadLeaderboard`, `publishScore`.
- Audio: `toggleSound`, `playTone`, `playCorrectSound`, `playWrongSound`, `playMissionSound`.

Patch/helper scripts:

- `poster-loader.js` injects runtime style, tracks runtime errors, blocks legacy blur handling until load, fetches poster chunks.
- `nabatick-directional.js` monkeypatches `CanvasRenderingContext2D.drawImage` to swap Nabatick directional/eating sprites.
- `mobile-*.js` scripts add classes and behavior around mobile overlays and answer input.

## Menu States

Current menu states:

- Main menu shown: `#start-screen` visible, `#player-form.main-menu` active.
- Mode sheet open: `#mode-panel[hidden=false]`, `mode-control-button[aria-expanded=true]`.
- Difficulty sheet open: `#difficulty-panel[hidden=false]`, `difficulty-control-button[aria-expanded=true]`.
- Settings sheet open: `#settings-panel[hidden=false]`, `profile-control-button[aria-expanded=true]`.
- Leaderboard open: `#leaderboard-dialog[hidden=false]`.
- Gameplay running: `#start-screen[hidden]`, canvas active, HUD visible.
- Question open: `#question-dialog[hidden=false]`, `html.question-open` on mobile.
- Results shown: `#end-screen[hidden=false]`, leaderboard publish panel optionally visible.

## Character Selection

Current visible characters:

- Bifly: default checked radio, uses `assets/bifly-menu.png` for menu and Bifly gameplay sprites.
- Nabatick: unchecked radio, menu uses `assets/nabatick-idle-reference.png`, gameplay uses 512 reference sprites with directional replacement helper.

Preserve:

- Character choice persistence in local save/settings.
- `mathMazeCharacter` storage key compatibility.
- Bifly and Nabatick gameplay behavior.
- Nabatick directional/eat visual states until a safer replacement exists.

Risks:

- User-reported mobile flicker when choosing a character needs a focused interactive repro pass.
- Character visuals are animated/transformed in CSS and also affected by mobile reduced-animation overrides.
- Nabatick has multiple generations of assets in the repo, increasing the chance of accidental use of outdated sprites.

## Game Mode Selection

Current modes:

- Arcade, default selected.
- Adventure.

State source:

- Radio inputs named `game-mode`.
- `state.modeId`.
- Menu and result labels sync from the same mode configuration.

Preserve:

- Existing mode labels, scoring integration, mission/progression behavior, result reporting, and leaderboard filters.

## Difficulty Selection

Current difficulties:

- Beginner
- Normal, default selected
- Advanced
- Expert
- Legendary

State source:

- Radio inputs named `difficulty`.
- `state.difficultyId`.
- Difficulty configuration in `kaflul-systems.js`.

Preserve:

- Five stable Hebrew difficulties.
- Legendary unlock rules.
- Score multiplier behavior.
- Existing save migration/default behavior.

## Gameplay HUD

HUD components:

- Correct answers
- Level
- World
- Score
- Mode
- Difficulty
- Combo
- Lives
- Mission summary, visually hidden in some states
- Sound, pause, and leaderboard buttons

Current behavior:

- HUD is hidden/disabled on main menu/results/leaderboard states through opacity and pointer-event rules.
- On gameplay, HUD is overlaid above the canvas.
- Several mobile files adjust HUD density, position, opacity, and question-state behavior.

Preserve:

- All metric values and state updates.
- Pause/sound/leaderboard control behavior.
- Canvas gameplay dimensions and input mapping.

## Question Dialog

Question dialog components:

- Dialog title
- Question text
- Timer bar
- Native text input with numeric input mode
- Submit button
- Feedback region

Current behavior:

- `askQuestion` sets phase to question, opens dialog, focuses input, starts timer.
- `finishQuestion` hides dialog and returns to gameplay flow.
- `mobile-question-state.js` mirrors question visibility to `html.question-open`.
- `mobile-native-answer.js` preserves native input behavior.

Preserve:

- Question generation and answer evaluation.
- Timer/scoring rules.
- Native mobile answer input behavior.

## Pause Behavior

Current behavior:

- Pause state is managed by `togglePause` and core state machine logic.
- Pause overlay is rendered on the canvas rather than as a separate HTML screen.
- `poster-loader.js` patches/guards blur behavior so visible browser blur does not pause unexpectedly.

Preserve:

- Pause/resume state machine.
- Existing keyboard/button controls.
- No unintended pause when the document remains visible.

## Results Screen

Current components:

- Score
- Correct answer count
- Best score
- Rank
- Mode
- Difficulty
- Performance/progress fields
- Publish score panel
- Restart and leaderboard buttons

Preserve:

- Score calculation.
- Local best and leaderboard write paths.
- Publish score validation.
- Restart flow back to menu.

## Leaderboard

Current components:

- Modal dialog
- Refresh/close icon buttons
- Mode and difficulty filters
- Local leaderboard list
- Status region

Preserve:

- Local sorting/filtering.
- Remote champion API behavior if enabled.
- Device-local records and save compatibility.

Risk:

- `leaderboard.css` defines global classes that overlap with menu action buttons. Keep this contained in Phase 1 before visual redesign.

## Asset Loading

Preloaded in `index.html`:

- `assets/kaflul-logo-official.png`
- `assets/bifly-menu.png`
- Bifly gameplay sprites
- Nabatick reference gameplay sprites
- Dark enemy sprites
- `assets/math-maze-poster.png`

Loaded by code:

- `game.js` initializes image objects for characters/enemies.
- `poster-loader.js` fetches poster chunk data when present.
- `nabatick-directional.js` replaces drawImage calls for Nabatick states.

Risks:

- Initial payload includes a 1.85 MB poster and an 894 KB logo before gameplay.
- Asset naming includes old and new Nabatick variants.
- Runtime sprite replacement is fragile and hard to test.

## Asset Dimensions

See `docs/UI_ASSET_REQUIREMENTS.md` for the detailed asset table.

Important current dimensions:

- Official logo: `1065x489`, 894 KB.
- Poster: `1448x1086`, 1.85 MB.
- Bifly PNG sprites: `512x512`.
- Dark enemy PNG sprites: `512x512`.
- Nabatick reference PNG sprites: `512x512`.
- Older Nabatick PNGs: `128x128`.
- Older Nabatick WebPs: `160x160`.

## Image Quality And Consistency

Current image quality is mixed:

- Bifly and enemies are high-resolution PNGs with consistent 512x512 canvas.
- Nabatick now has 512 reference PNGs, but old low-resolution PNG/WebP/SVG variants remain.
- Menu poster/background is large and visually dominant.
- The official logo is high quality but heavy.
- The menu currently depends on image cropping/positioning rather than a consistent character safe area.

## Animation Logic

CSS animation sources:

- `styles.css`: stage hit, metric pulse, life hit, progress pulse.
- `main-menu.css`: menu float, particle drift, character breathe.

JavaScript animation sources:

- Canvas render loop in `game.js`.
- Character/enemy state rendering in `game.js`.
- Sprite substitution in `nabatick-directional.js`.

Reduced-motion support exists in `styles.css` and `main-menu.css`, but future motion should be centralized and tested on low-end mobile.

## Sound Feedback

Sound is generated through WebAudio in `game.js`:

- Correct answer tone.
- Wrong answer tone.
- Mission feedback.
- General `playTone` helper.
- Sound enabled state persists through local settings.

Preserve:

- Existing mute state and menu/game sound button synchronization.
- Feedback timing for answers and missions.

## Accessibility

Positive baseline:

- Document is Hebrew RTL with `lang="he"` and `dir="rtl"`.
- Main menu groups use `aria-label`.
- Character, mode, and difficulty choices are native radio inputs.
- Dialogs use `role="dialog"` and `aria-modal` in key places.
- Many icon buttons have accessible names.
- Leaderboard status/list regions use live-region attributes.

Risks:

- Icon visuals are mostly Unicode glyphs instead of real icon assets/components.
- Dialog focus trapping and return focus behavior were not fully verified.
- Canvas gameplay has limited semantic fallback.
- Some visual states rely on glow/color/opacity.
- Motion and animated backgrounds may be distracting, even with reduced-motion fallbacks.
- Hidden native inputs inside custom radio cards require careful focus-visible verification.

## RTL Behavior

Positive baseline:

- Root RTL is set correctly.
- Hebrew labels are present throughout the menu, dialogs, HUD, results, and leaderboard.
- CSS generally uses logical/RTL-aware positioning through grid and centered layouts.

Risks:

- Some control-strip text is clipped/ellipsized in mobile landscape.
- Numeric values mixed with Hebrew labels need consistent bidirectional ordering.
- Future icon placement should be checked in RTL, not merely mirrored from LTR.

## Performance Risks

- Large initial visual assets: poster, logo, multiple 512 PNG sprites.
- Ten stylesheet layers on first load.
- Expensive visual effects: blur, glow, drop-shadow, large radial gradients, canvas plus overlay animation.
- Runtime style injection in `poster-loader.js`.
- Canvas `drawImage` monkeypatch in `nabatick-directional.js`.
- Multiple mobile CSS patches with overlapping responsibilities.
- No automated visual regression suite for the required viewport matrix.

## Visual Inconsistencies

Verified visually in baseline screenshots:

- Nabatick sits low and is partially buried/cropped by the lower menu area, especially portrait and desktop.
- In 1440x900 desktop, Nabatick label/character area visually competes with the CTA glow and lower layout.
- In 844x390 landscape, lower control cards compress and one label is visibly truncated.
- Unicode glyph icons feel inconsistent with the high-quality logo/character art.
- The leaderboard card and character hero use different density/scale language.
- The menu resembles a production direction but still has overlapping legacy density and hotfix artifacts.

## Duplicated Or Conflicting Rules

Confirmed conflict surfaces:

- `#start-screen` styles exist in base, mobile hotfix, arcade foundation, and main menu files.
- `.hud` is styled across base, mobile, resolution, final layout, and arcade foundation files.
- `.dialog` and question behavior are affected by base CSS plus mobile question/native-answer CSS.
- `.difficulty-options` and `.mode-options` appear in both legacy/base and current menu styles.
- `.leaderboard-open-button` is shared between leaderboard and menu contexts.
- `main-menu.css` contains broad late-cascade rules that can mask earlier mobile fixes.

## Obsolete-File Candidates

Do not delete in Phase 0. Verify in Phase 1 before removal.

- Legacy start-screen classes inside `styles.css` such as old poster/panel start layouts.
- `mobile-camera-fit-runtime.js`, currently not loaded by `index.html`.
- `mobile-runtime-loader-note.txt` and old mobile fix notes, if no longer used operationally.
- Older Nabatick assets:
  - `assets/nabatick-idle.png`
  - `assets/nabatick-eat.png`
  - `assets/nabatick-eat-prepare.png`
  - `assets/nabatick-idle-front.webp`
  - `assets/nabatick-idle-left.webp`
  - `assets/nabatick-idle-right.webp`
  - `assets/nabatick-eat-open.webp`
  - `assets/nabatick-eat-prepare.webp`
  - `assets/nabatick-*-v2.svg`
  - `assets/nabatick-selection-sheet.svg`
- Generated tool scripts under `tools/` that are no longer part of the production workflow.

## High-Risk Files

- `game.js`: 4056 lines, owns gameplay, rendering, UI state, persistence, and leaderboard flow.
- `main-menu.css`: 1572 lines, final cascade authority for the current home screen.
- `styles.css`: 1408 lines, base plus legacy UI.
- `mobile-enhancements.css`: 726 lines, broad mobile behavior.
- `mobile-final-layout.css`: 16 `!important` rules and late mobile overrides.
- `poster-loader.js`: runtime style injection and event-listener patching.
- `nabatick-directional.js`: canvas drawImage monkeypatch.
- `leaderboard.css`: dialog styles plus shared button classes.
- `.github/workflows/apply-*.yml`: workflows that can commit generated changes on selected branches/paths.

## Functionality That Must Be Preserved

- Canvas gameplay and movement.
- Question generation, answer validation, and timer behavior.
- Scoring, combos, speed bonus, lives, level/world progression.
- Bifly and Nabatick selection and persistence.
- Black enemy behavior and sprite states.
- Arcade and Adventure modes.
- Five difficulty levels and Legendary unlock rules.
- Missions and mission feedback.
- Pause/resume behavior.
- Sound toggle and answer feedback.
- Local save schema and migration.
- Local leaderboard sorting/filtering and champion publishing behavior.
- Existing Vercel static deployment behavior.

## Missing UI Assets

Detailed in `docs/UI_ASSET_REQUIREMENTS.md`.

High-priority missing assets:

- Non-Unicode UI icon set for settings, sound on/off, leaderboard, pause, close, refresh, mode, difficulty, profile, score, rank, lives, timer.
- Button and panel texture system that is not simulated solely by CSS glow.
- Character-safe menu renders for selected/unselected states.
- Modal/sheet background and control assets that match the logo/character art direction.
- Mobile landscape-specific layout assets or safe-area variants.

## Missing Character Animation Assets

High-priority missing character states:

- Menu idle, selected, hover/press, victory, locked/unavailable state for each hero.
- Gameplay directional idle/move/eat/prepare/eat-result frames for Bifly and Nabatick.
- Answer feedback expressions: correct, wrong, combo, low-time, damage/life lost.
- Enemy expression set with consistent lighting and dimensions.

## Quick Wins

For later phases only:

- Create a CSS ownership map and freeze old mobile hotfixes behind documented boundaries.
- Replace Unicode glyph icons with a real icon component/asset set.
- Fix Nabatick menu safe area before deeper layout changes.
- Add visual regression checks for the five required viewports.
- Add a character-selection interaction test for mobile.
- Reduce or defer large poster/logo payloads.
- Consolidate selected-mode/difficulty/character labels into one UI model.

## Major Refactors

For later phases only:

- Split `game.js` UI state from gameplay/rendering logic without changing behavior.
- Create a dedicated menu UI layer with one owner CSS file.
- Replace mobile hotfix cascade with named responsive contracts.
- Replace canvas drawImage monkeypatch with explicit sprite selection.
- Introduce an asset manifest with dimensions, roles, and preload priority.
- Introduce a focused UI test matrix for menu, gameplay HUD, question dialog, results, and leaderboard.

## Testing Gaps

Existing coverage:

- `tests/kaflul-systems.test.js` covers difficulty, scoring, math performance, leaderboard sorting/filtering, persistence, state machine, and swipe detection.
- `tests/game.spec.js` covers start flow, blur/pause regression, native mobile answer input, and Map prototype safety.

Gaps:

- Browser suite could not complete locally because Playwright's browser binary is missing.
- No screenshot/visual regression tests for the five Phase 0 viewport sizes.
- No automated test for menu sheet focus management.
- No automated character-selection flicker/regression test.
- No automated test for Nabatick asset direction/eating substitutions.
- No automated test for RTL clipping in mixed numeric/Hebrew labels.
- No performance budget test for initial image weight.

## Verified Bugs And Risks

Verified in this Phase 0 pass:

- Mobile/desktop menu composition: Nabatick is positioned too low and appears partially buried in the layout.
- 844x390 landscape: lower control cards visibly clip/truncate text.
- Icon system: current UI uses Unicode glyphs, conflicting with the master spec requirement for custom/lucide-style icons.
- CSS architecture: multiple late hotfix layers target the same UI areas, making future changes high risk.
- Playwright local smoke suite is blocked by missing browser binary after dependency resolution.

User-reported but not fully reproduced in this pass:

- Mobile character-selection flicker after choosing a character. The current CSS/JS selection path is a plausible risk area and needs a focused interactive recording in Phase 1 preparation.

## Commands Run During Audit

- `pwd`
- `ls -la docs`
- `wc -l docs/UI_NEXT_LEVEL_MASTER_SPEC.md`
- `find . -maxdepth 2 -type f | sort`
- `node --check kaflul-systems.js`
- `node --check game.js`
- `node --check mobile-enhancements.js`
- `node --test tests/kaflul-systems.test.js`
- `pnpm test`
- `python3 -m http.server 4180 --bind 127.0.0.1`
- Headless Chrome/CDP baseline capture script through bundled Node.
- Pillow image-dimension inspection for baseline screenshots.
- `rg` inspections for CSS breakpoints, animation, character state, and UI state.

## Test Results

- Syntax checks passed for `kaflul-systems.js`, `game.js`, and `mobile-enhancements.js`.
- Node test suite passed: 11 tests passed in `tests/kaflul-systems.test.js`.
- Full `pnpm test` did not pass locally because Playwright browser executable is missing at `/Users/eliran/Library/Caches/ms-playwright/.../chrome-headless-shell`.
- No production bug was identified by the Node tests.

## Phase 1 Foundation Addendum

Date: 2026-06-28

Phase 1 did not remove production CSS files. Instead it introduced an explicit foundation layer and a mobile cascade boundary:

- Added `ui/foundation.css` for design tokens, component primitives, SVG icon sizing, and reduced-motion primitives.
- Added `ui/mobile-overrides.css` as the single top-level mobile override boundary. It imports the existing mobile hotfix files in their original order.
- Reduced top-level stylesheet links in `index.html` from 10 to 6.
- Added `ui/icons.svg` as the SVG sprite foundation.
- Added `ui/assets/asset-manifest.js` as the current production asset manifest foundation.
- Added `tools/phase1_visual_regression.mjs` for required viewport screenshots, Phase 0 comparison, console/runtime checks, overflow checks, and smoke acceptance.
- Phase 1 verification now passes the full local `pnpm test` command after the Playwright browser binary was installed. The earlier Phase 0 local blockage is no longer current for this workstation.

CSS architecture measurement after Phase 1:

| Measure | Phase 0 | Phase 1 |
| --- | ---: | ---: |
| Top-level stylesheet links in `index.html` | 10 | 6 |
| Top-level mobile hotfix links in `index.html` | 6 | 1 |
| Deleted CSS files | 0 | 0 |
| New `!important` rules in foundation work | 0 | 0 |

Phase 1 deliberately keeps legacy CSS and mobile hotfix files available for reviewability. Later phases may remove or rewrite them only after visual and behavior coverage is strong enough.

Phase 1 verified behavior through the visual/acceptance script:

- Character selection persists.
- Mode selection persists.
- Difficulty selection persists.
- Nickname persists.
- Sound state persists.
- Mode, difficulty, settings, and leaderboard surfaces open.
- Game starts.
- Pause/resume works.
- Game returns to menu.
- No console/runtime errors were detected in the scripted pass.

Remaining risks after Phase 1:

- Legacy hearts and a few fallback glyphs remain until later icon migration.
- `game.js` still owns gameplay and UI state together.
- Mobile hotfix source files still overlap, though they now have one top-level cascade boundary.
- Playwright package/browser installation remains unavailable in this local environment without network access.

## Phase 2 Home Hub Addendum

Date: 2026-06-28

Phase 2 touched only the home/menu hub. Gameplay rules, save schema, leaderboard data format, and secondary screens were preserved.

Verified bug fixed during Phase 2:

- `.leaderboard-open-button` from `leaderboard.css` applies `position: fixed` globally. Reusing that class for the home rank button caused the rank control to sit outside the top player bar and cover the settings hit target on mobile. The home rank button now scopes itself back to `position: static` through `main-menu.css`.

Current home-specific risks after Phase 2:

- The home scene still relies on static character PNGs instead of production animation sheets.
- Nabatick uses a reference-safe idle image and still needs final state assets.
- The living maze scene is CSS-rendered; future art layers need explicit dimensions to avoid layout shift.
- The Playwright package is not installed locally in the current workspace, so Phase 2 browser coverage is provided by the CDP verifier rather than the package Playwright suite.

Observed as preserved in Phase 2 verification:

- Character, mode, difficulty, nickname, and sound persistence.
- Leaderboard open/close.
- Settings open/close.
- Game start and return to menu.
- RTL document direction.
- No document overflow or checked text overflow across required Phase 2 viewports.

## Phase 3 Hero Gallery Addendum

Date: 2026-06-28

Phase 3 added a dedicated character gallery and preserved existing gameplay behavior. Character selection still flows through the existing radio controls and `setCharacter`; there is no new save schema.

Verified behavior after Phase 3:

- Gallery opens from the home hub character entry points.
- Previous/next controls browse Bifly and Nabatick.
- Keyboard arrows browse characters.
- Enter confirms the previewed character.
- Touch swipe browses characters.
- Selection persists after reload.
- Home hub updates immediately after selection.
- Character art is not distorted or clipped in the required viewports.
- No document overflow, checked text overflow, console errors, or runtime errors were reported by the Phase 3 CDP verifier.

Current Phase 3 risks:

- Character animation remains static PNG based until final animation assets are supplied.
- Tap and selected responses are UI feedback, not character animation states.
- Rive and Spine are adapter-compatible but no runtime or approved files are bundled.
- Character-specific best can only be shown from existing leaderboard entries with character metadata; the current `personalBests` store is not character-specific.

## Phase 4 Gameplay HUD Addendum

Date: 2026-06-28

Phase 4 changed the gameplay HUD presentation only. It preserved gameplay and persistence behavior.

Verified preserved behavior:

- Game starts from the existing home action.
- Desktop keyboard play remains functional in the scripted session.
- Mobile touch/swipe play remains functional in the scripted session.
- Pause and resume still use the existing state path.
- Sound toggle still updates existing sound state.
- Question dialog still opens.
- Correct answers still increase score/progress through existing logic.
- Wrong answers and timeouts still reduce lives through existing logic.
- Game over still appears through the existing end-screen path.
- No console or runtime errors were reported by the Phase 4 CDP verifier.

Verified UI improvements:

- Always-visible HUD is limited to score, combo, lives, wave/level progress, current mission, pause, and sound.
- Secondary mode/difficulty/world/level context is hidden from the active HUD and exposed in the pause overlay.
- Lives use SVG icons instead of text hearts.
- Progress rail has `role="progressbar"` and updated ARIA values.
- Pause and sound controls have readable Hebrew text in addition to icons.
- Required viewport screenshots show no document overflow, out-of-bounds HUD elements, or checked text overflow.

Gameplay-adjacent visual changes:

- `drawPaused` now renders a richer pause card with secondary context and resume instructions.
- Mobile gameplay stage sizing now fills the visual viewport while the start screen is hidden.
- Arcade progress display now shows current-wave progress in the HUD; total correct answers remain unchanged in state.

Remaining Phase 4 risks:

- Full victory and world-transition journeys were not exhaustively played to 100 correct answers in automation; the HUD progress path and existing results path were smoke-verified instead.
- HUD feedback uses CSS animation classes, not final motion-system tokens.
- HUD sound hooks still use existing tone behavior; no branded sound files exist yet.
- Future question-dialog redesign must re-check that HUD overlays do not compete with the dialog on very small portrait screens.

## Phase 5 Secondary Screens Addendum

Date: 2026-06-28

Phase 5 unified secondary screens while preserving gameplay and persistence behavior.

Verified preserved behavior:

- Character, mode, difficulty, nickname, and sound selections remain persisted through the existing storage/save paths.
- Game start still works from the home action and the pre-game sheet.
- Pause/resume still uses existing phase/timer behavior.
- Safe restart from pause uses the existing retry path.
- Return to menu still uses the existing start-screen path.
- Results still open through the existing game-over flow.
- Leaderboard still renders existing local entries and highlights the current player.
- Progress screen shows only stored unlock and best-score data.

Verified UI improvements:

- Pre-game, mode, difficulty, settings, pause, results, leaderboard, and progress surfaces now share a single Phase 5 visual foundation.
- All Phase 5 secondary screens have focus trapping, Escape close behavior, and focus restoration.
- Difficulty choices expose player-facing differences and score multipliers without unnecessary technical configuration values.
- Legendary locked state is documented in the UI without changing unlock logic.
- Leaderboard includes loading, empty, error, refresh, local/public distinction, filters, and current-player highlight states.
- Results hierarchy now puts result emotion, score/record, rank/progression, stats, actions, and score breakdown in a clearer order.

Current Phase 5 risks:

- The Playwright test dependency is not installed locally; browser coverage is provided by the custom CDP verifier.
- Legacy mobile hotfix styles still exist and can influence form density; they should not be deleted without a dedicated cleanup phase.
- Public leaderboard UI states are present, but remote public leaderboard behavior is not implemented.
- Full progression/reward systems remain unsupported and must not be represented until real stored data exists.

## Phase 6 Motion And UI Audio Addendum

Date: 2026-06-29

Phase 6 added shared feedback systems while preserving gameplay and persistence behavior.

Verified preserved behavior target:

- Existing UI state paths still own character, mode, difficulty, nickname, sound, sheets, leaderboard, pause, results, and game start.
- Gameplay rules for scoring, lives, combo, missions, question timing, enemy behavior, movement, and win/loss conditions were not changed.
- Save schema and leaderboard data shape were not changed.

New architecture:

- `ui/motion/motion.css` defines shared transform/opacity animations, durations, easing, scale limits, particle styling, and reduced-motion overrides.
- `ui/motion/motion-system.js` exposes `window.KaflulMotionSystem` with `play`, `show`, `hideAfter`, `emitParticles`, `isReducedMotion`, and diagnostics.
- `ui/sounds/ui-sound-controller.js` exposes `window.KaflulUiSound` with mute-aware, autoplay-safe named UI sound events.
- `ui/assets/asset-manifest.js` now documents Phase 6 motion and UI-audio metadata.
- `tools/phase6_motion_audio_verification.mjs` covers required viewports, screenshots, console/runtime checks, RTL, audio mute/autoplay, reduced-motion behavior, hidden-animation checks, particle caps, and animation performance sampling.

Current Phase 6 risks:

- UI audio still uses generated WebAudio tones because no approved branded audio files exist.
- Character tap/select responses are UI-level motion feedback, not final character animation states.
- Only approved character states remain `idle` and `eat`; all richer states still require real assets.
- Full Playwright package coverage remains dependent on local dependency availability; the Phase 6 verifier provides the phase-specific browser coverage.
