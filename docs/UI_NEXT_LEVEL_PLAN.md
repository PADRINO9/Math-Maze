# Kaflul UI Next Level - Phase 0 Plan For Later Phases

Date: 2026-06-28
Scope: Planning only. Do not treat this as implementation approval.

## Guiding Constraints

- Preserve gameplay behavior.
- Preserve save and leaderboard data.
- Preserve canvas coordinate assumptions.
- Preserve Bifly and Nabatick IDs.
- Preserve Arcade and Adventure modes.
- Preserve five difficulty IDs and Legendary unlock behavior.
- Preserve question/scoring/combo/lives/mission behavior.
- Keep Hebrew RTL as the primary interface direction.
- Mobile portrait is the primary target.
- Do not remove legacy files until Phase 1 verifies usage.

## Implementation Sequence

### Phase 1 - Foundation And Cleanup

Goal: make the existing UI safe to change without altering behavior.

Work:

- Create a CSS ownership map and mark each file as base, mobile patch, feature, or candidate obsolete.
- Add a visual regression harness for the five required viewport sizes.
- Add mobile character-selection interaction coverage.
- Introduce design tokens for spacing, color, z-index, radius, shadow, type, and motion.
- Create an asset manifest document.
- Define a single owner for start-screen/menu CSS.
- Add safe wrappers around UI state changes without changing gameplay.

Acceptance criteria:

- Existing Node tests pass.
- Browser smoke tests pass in an environment with Playwright browsers installed.
- Baseline screenshots can be regenerated.
- No save data keys are renamed or removed.
- No gameplay values change.
- Obsolete candidates are documented, not deleted blindly.

### Phase 2 - Home Hub

Goal: rebuild the main menu as a production-grade game hub using the existing logic.

Work:

- Redesign home layout around logo, character selection, start CTA, score/rank preview, and control strip.
- Replace Unicode glyphs with real icons.
- Fix Bifly/Nabatick character scale, crop, and selected state.
- Preserve existing radio inputs or equivalent accessible controls.
- Preserve `setCharacter`, `setMode`, `setDifficulty`, and local save behavior.
- Build mobile portrait first, then landscape and desktop.

Acceptance criteria:

- Character selection does not flicker on mobile.
- Nabatick and Bifly both fit their cards at all required viewports.
- Start button remains clear and reachable.
- Mode, difficulty, and nickname remain editable.
- Leaderboard preview remains functional.
- Screenshots pass at 390x844, 430x932, 844x390, 1280x720, and 1440x900.

### Phase 3 - Hero And World Presentation

Goal: make the first screen feel like a polished original Kaflul game world.

Work:

- Establish an original art direction using the official logo and character assets.
- Introduce character-safe hero composition.
- Introduce world/progression hints without changing gameplay rules.
- Replace generic atmospheric layering with a coherent world scene.

Acceptance criteria:

- First viewport clearly communicates Kaflul, multiplication, maze, character choice, and start action.
- Mobile portrait remains uncluttered.
- No stock-like or generic UI art dominates the screen.
- Asset loading remains within agreed performance budget.

### Phase 4 - Gameplay HUD

Goal: modernize HUD and question overlays without touching gameplay math or movement.

Work:

- Redesign HUD as a compact mobile-first overlay.
- Separate persistent gameplay status from transient answer feedback.
- Improve lives/combo/mission display.
- Make pause and sound controls accessible and reachable.
- Keep the canvas playable area stable.

Acceptance criteria:

- Canvas gameplay remains unchanged.
- Question flow, answer timing, and scoring remain unchanged.
- HUD does not block critical maze visibility.
- Mobile portrait and landscape both remain playable.
- Pause/resume tests pass.

### Phase 5 - Secondary Screens

Goal: make results, leaderboard, settings, difficulty, mode, and mission screens feel consistent.

Work:

- Redesign modal/sheet system with shared tokens.
- Improve results hierarchy and replay flow.
- Improve leaderboard filters and empty states.
- Improve settings/nickname form.
- Verify focus handling and escape/close behavior.

Acceptance criteria:

- All dialogs have accessible names.
- Keyboard/focus behavior is predictable.
- Leaderboard filters still work.
- Score publishing still works.
- Result values match pre-redesign behavior.

### Phase 6 - Motion And Audio

Goal: add premium feedback without reducing clarity or performance.

Work:

- Define motion tokens for selection, button press, answer feedback, screen transitions, and combo.
- Replace uncontrolled infinite animation with purposeful motion.
- Keep reduced-motion behavior.
- Define named audio feedback tokens on top of existing WebAudio behavior or approved assets.

Acceptance criteria:

- Motion does not cause mobile flicker.
- Reduced-motion mode removes non-essential animation.
- Sound toggle persists.
- Answer feedback timing remains clear.
- Performance remains acceptable on mobile.

Phase 6 implementation note, 2026-06-29:

- Added the shared motion spec in `docs/UI_MOTION_SPEC.md`.
- Added the shared UI sound spec in `docs/UI_SOUND_SPEC.md`.
- Added `ui/motion/motion.css` and `ui/motion/motion-system.js` for layout-neutral transform/opacity feedback, capped particles, reduced-motion behavior, and open/close helpers.
- Added `ui/sounds/ui-sound-controller.js` for named UI sound events on top of generated WebAudio tones.
- Updated the asset manifest with motion and UI-audio metadata.
- Wired existing home, hero gallery, secondary screens, HUD feedback, results, and leaderboard interactions to the shared systems without changing gameplay rules or save schema.
- Added `tools/phase6_motion_audio_verification.mjs` and `npm run test:motion` for required viewport screenshots, audio mute/autoplay checks, reduced-motion checks, console/runtime checks, RTL checks, overflow checks, hidden-animation checks, and motion performance profiling.

### Phase 7 - QA, Performance, And Polish

Goal: release-ready confidence.

Work:

- Run full automated tests.
- Run screenshot comparisons for required viewports.
- Test real mobile portrait and landscape.
- Verify Vercel deployment output.
- Check accessibility basics.
- Measure initial payload and rendering performance.
- Confirm no console errors.

Acceptance criteria:

- Node and browser tests pass.
- Required viewport screenshots approved.
- No known blocking console/runtime errors.
- No unintended save/leaderboard migration.
- No UI overlap in required viewports.
- Vercel production deployment succeeds.

## Quick Wins For Later Phases

- Replace menu glyphs with real icons.
- Fix Nabatick menu positioning/safe area.
- Add a `npm run screenshot:baseline` or equivalent local command.
- Add a mobile character-selection smoke test.
- Document CSS file ownership in comments or docs before deleting anything.
- Reduce first-load image weight with optimized variants.

## Major Refactors For Later Phases

- Split `game.js` into gameplay core, rendering, UI state, and persistence modules.
- Replace mobile hotfix files with scoped responsive layers.
- Replace `nabatick-directional.js` monkeypatch with explicit sprite selection.
- Move UI metadata into a single config/model consumed by menu, HUD, results, and leaderboard.
- Create a stable asset manifest and loader priority model.

## Testing Plan

Required automated checks:

- Existing Node tests.
- Existing Playwright smoke tests.
- New screenshot baseline across required viewport matrix.
- Character selection interaction on mobile.
- Mode and difficulty selection.
- Start game from menu.
- Question dialog input on mobile.
- Pause/resume.
- Results screen and leaderboard open/close.

Required manual checks:

- iPhone-size portrait.
- Large phone portrait.
- Short landscape.
- 1280x720 desktop.
- 1440x900 desktop.
- Hebrew RTL text and numeric ordering.
- Reduced-motion mode.
- Sound on/off behavior.

## Risk Register

| Risk | Severity | Mitigation |
| --- | --- | --- |
| CSS cascade conflicts across ten stylesheets | High | Phase 1 ownership map and visual baseline before edits. |
| `game.js` owns too many responsibilities | High | Extract only after tests exist; preserve public state paths. |
| Save/leaderboard behavior regression | High | Keep storage keys, add fixture tests before UI refactor. |
| Mobile character-selection flicker | High | Reproduce with recording and add regression coverage. |
| Nabatick asset confusion | Medium | Asset manifest and safe-area standard. |
| Heavy first-load assets | Medium | Optimize/defer with measured budget. |
| Dialog accessibility gaps | Medium | Add focus-management tests. |
| Playwright browser missing locally | Medium | Install/cache browser in dev/CI environment before relying on full suite. |
| Workflows that can mutate branches | Medium | Review before Phase 1 cleanup touches tool/workflow paths. |

## Assumptions

- The current root-level static file structure is intentional for Vercel.
- The current local save schema must remain backward compatible.
- Bifly and Nabatick are both required playable characters.
- Arcade and Adventure both remain in scope.
- The five current difficulties are final product concepts.
- The official logo supplied by the user is the preferred logo source.
- No Phase 1 implementation should start until this Phase 0 documentation is reviewed.

## Phase 1 Completion Notes

Phase 1 implemented the foundation and cleanup layer only. It did not begin the Phase 2 home hub redesign.

Completed:

- Central design tokens and reusable component foundations in `ui/foundation.css`.
- Reduced-motion foundation in the same cascade layer.
- SVG icon sprite foundation in `ui/icons.svg`.
- Asset manifest foundation in `ui/assets/asset-manifest.js`.
- Mobile CSS cascade boundary in `ui/mobile-overrides.css`.
- Top-level stylesheet link reduction from 10 to 6.
- Visual-regression and acceptance script in `tools/phase1_visual_regression.mjs`.
- Updated tests to avoid depending on Unicode pause/sound glyphs.
- Added persistence smoke coverage for character, mode, difficulty, nickname, and sound state.

Deferred to later phases:

- Home screen redesign.
- Character screen redesign.
- Gameplay HUD redesign.
- Full motion system.
- Full UI sound system.
- Deleting legacy hotfix files.
- Removing all remaining Unicode fallback glyphs from dynamic gameplay text.

Phase 2 may start only after Phase 1 is reviewed and accepted.

## Phase 2 Completion Notes

Phase 2 redesigned only the home screen as a premium, mobile-first Kaflul game hub. It did not redesign the dedicated character screen, gameplay HUD, question dialog, pause screen, results screen, leaderboard, or later-phase motion/audio systems.

Completed:

- Rebuilt the home screen hierarchy around a compact top player bar, central living hero scene, primary `שחק עכשיו` action, pre-game summary controls, and bottom navigation.
- Integrated the official Kaflul logo, Bifly, Nabatick, black enemies, maze routes, ambient particles, and four-world hints into the home scene.
- Preserved existing IDs and state paths for character, mode, difficulty, nickname, sound, leaderboard, and start-game behavior.
- Added static future-facing character animation hooks with `data-character-state` and `data-animation-state`.
- Added focused home navigation behavior for `משחק`, `דמויות`, `התקדמות`, and `אלופים`.
- Added `tools/phase2_home_verification.mjs` for required viewport screenshots, console/runtime checks, RTL checks, touch/keyboard checks, persistence checks, and start/return smoke coverage.
- Added Phase 2 screenshot artifacts under `docs/phase2-screenshots/`.
- Fixed the home rank button conflict with `leaderboard.css` by scoping the home rank button back into the top player bar.

Deferred to later phases:

- Full character animation state system.
- Dedicated character-management screen redesign.
- Gameplay HUD redesign.
- Full audio feedback system.
- World-specific animated background art.
- Replacing low-resolution or reference-only character art with production-ready sprite sheets.

Phase 3 must not assume unsupported progression data. Progress surfaces should continue to show only verified save/leaderboard information.

## Phase 3 Completion Notes

Phase 3 built the dedicated Bifly/Nabatick hero gallery only. It did not begin Phase 4, change gameplay rules, redesign the gameplay HUD, or add unsupported progression data.

Completed:

- Added a full-screen premium hero gallery launched from the home hub character controls.
- Added large selected-character presentation, Hebrew name, short personality copy, character-specific lighting, black enemies, maze route decoration, previous/next controls, select confirmation, and return-to-home flow.
- Added keyboard navigation, touch swipe navigation, tap reaction, entrance animation, and reduced-motion-compatible fallbacks.
- Preserved character gameplay behavior; both characters still use the existing `setCharacter` path and persisted storage.
- Added `ui/character-animation-adapter.js` supporting `static-png`, `sprite-sheet`, `layered-png-rig`, `rive`, and `spine` adapter paths without paid-tool requirements.
- Updated `ui/assets/asset-manifest.js` with Phase 3 character-animation metadata.
- Added `tools/phase3_hero_verification.mjs` and required hero-gallery screenshot artifacts.
- Updated Phase 2 home verification to treat the new character gallery as the expected character-control destination.

Deferred to later phases:

- Production sprite sheets or layered PNG rigs.
- Real blink, tap, selected, excited, worried, victory, defeat, and hit animation assets.
- Full motion system.
- Full audio asset system.
- Dedicated gameplay HUD redesign.
- Any Phase 4 work.

Phase 4 may start only after the Phase 3 gallery, asset manifest, and QA report are reviewed and accepted.

## Phase 4 Completion Notes

Phase 4 redesigned only the gameplay HUD. It did not change scoring rules, lives rules, combo rules, mission logic, progression logic, question generation, enemy behavior, movement behavior, win/loss conditions, save schema, or leaderboard behavior.

Completed:

- Rebuilt the always-visible HUD around score, combo, lives, wave/level progress, current mission, pause, and sound.
- Moved mode, difficulty, world, level number, and detailed mission context out of the always-visible HUD into secondary/pause-context surfaces.
- Replaced gameplay life hearts with SVG sprite icons from the existing icon infrastructure.
- Added HUD feedback hooks for score changes, combo milestones, life loss/gain, mission progress, mission completion, and wave/level progress.
- Added accessible progressbar metadata and readable pause/sound control labels.
- Added responsive HUD layouts for mobile portrait, mobile landscape, and desktop while keeping the canvas/playfield visually dominant.
- Added `tools/phase4_hud_verification.mjs` for required viewport screenshots, console/runtime checks, RTL checks, HUD visibility checks, FPS sampling, and gameplay-session acceptance.
- Added Phase 4 screenshot artifacts under `docs/phase4-screenshots/`.

Gameplay-adjacent but non-rule changes:

- The pause canvas overlay now displays secondary context: mode, difficulty, world, mission progress, and resume instructions.
- Mobile gameplay stage sizing is forced to the full visual viewport while the start screen is hidden, so the maze remains dominant behind the compact HUD.
- Arcade HUD progress now displays current wave progress out of the wave target instead of total correct answers; total correct-answer state remains unchanged internally.

Deferred to later phases:

- Full motion system.
- Full audio asset system.
- Gameplay character animation upgrades.
- Results screen redesign.
- Question-dialog redesign.
- World transition presentation redesign.

Phase 5 must not assume any gameplay-rule change from Phase 4. Phase 4 is a visual and interaction-shell HUD phase only.

## Phase 5 Completion Notes

Phase 5 redesigned and unified only the secondary screens. It did not begin Phase 6, redesign the home hub, redesign the hero gallery, change gameplay rules, change save schema, or replace existing assets.

Completed:

- Added a dedicated pre-game sheet with character, mode, difficulty, multiplier/rule context, and a primary start action.
- Upgraded mode selection with concise player-facing Arcade and Adventure explanations.
- Upgraded difficulty selection with meaningful gameplay differences, score multipliers, and a truthful Legendary locked-state requirement.
- Unified player settings around the existing nickname and sound behavior only.
- Added a real pause screen overlay with resume, safe restart, sound, settings/nickname, and return-to-menu actions while preserving timer/state behavior.
- Reworked the results screen hierarchy around emotional result, score/record, rank/progression, concise statistics, retry/return actions, and secondary score breakdown.
- Upgraded leaderboard presentation with current-player highlighting, readable ranks, local/public distinction, loading, empty, error, and refresh states.
- Added a progress sheet that shows only real stored local unlock/best-score information.
- Added focus trapping, Escape handling, and focus restoration for secondary dialogs.
- Added `ui/secondary-screens.css` as the shared Phase 5 styling layer.
- Added `tools/phase5_secondary_verification.mjs` and Phase 5 screenshot artifacts under `docs/phase5-screenshots/`.

Unsupported future features kept separate:

- Public online leaderboard integration beyond the current local data path.
- Progress currencies, achievements, rewards, account levels, or invented unlock tracks.
- Full motion system.
- Full branded audio asset system.
- Final character animation states.
- Question dialog redesign.
- Phase 6 progression or reward surfaces.

Remaining technical debt:

- Some legacy mobile hotfix styles still influence form-card density and should be retired only in a later approved cleanup phase.
- Playwright package tests cannot run in this workspace until dependencies are installed; Phase 5 browser coverage uses the local CDP verifier.
- Results and pause now share the Phase 5 visual language, but question dialog remains a later-phase surface.
- Public/local leaderboard wording is UI-ready, but public remote behavior is not implemented and must not be implied as live.

Phase 6 may start only after Phase 5 is reviewed and accepted.
