# UI CSS Cleanup Report

Phase: 8.6 CSS stabilization and hotfix-layer reduction
Date: 2026-06-29
Branch: `codex/ui-next-level-release`

## Scope

This phase reduced CSS runtime risk without redesigning screens or changing gameplay. The main change is that the mobile hotfix cascade is now self-contained in `ui/mobile-overrides.css` instead of loading six root-level CSS files through `@import`.

No gameplay rules, save schema, leaderboard scoring, character selection, mode selection, difficulty behavior, or HUD logic were changed.

## Before CSS Loading Map

Direct stylesheets in `index.html`:

| Order | File | Responsibility |
| --- | --- | --- |
| 1 | `styles.css?v=20260619-6` | Base shell, canvas/stage, legacy dialogs, legacy start/results foundations, reduced-motion base. |
| 2 | `ui/foundation.css?v=20260628-1` | Design tokens, shared icon/button/focus foundations. |
| 3 | `ui/mobile-overrides.css?v=20260628-1` | Phase 1 mobile cascade boundary. Before this phase it imported six root hotfix CSS files. |
| 4 | `leaderboard.css?v=20260622-1` | Leaderboard dialog, leaderboard buttons, public/local status states. |
| 5 | `arcade-foundation.css?v=20260628-1` | Arcade shell, gameplay HUD, results, gameplay-state responsive behavior. |
| 6 | `main-menu.css?v=20260628-4` | Home hub, hero gallery, menu sheets, pre-game controls, bottom navigation. |
| 7 | `ui/secondary-screens.css?v=20260628-1` | Shared secondary screens: sheets, pause, results, leaderboard refinements, progress. |
| 8 | `ui/motion/motion.css?v=20260629-1` | Motion tokens, particle styling, reduced-motion behavior. |

Indirect stylesheets loaded through `ui/mobile-overrides.css` before this phase:

| Order | Imported root file | Responsibility |
| --- | --- | --- |
| 1 | `mobile-enhancements.css?v=20260621-1` | Broad touch/mobile layout, old mobile controls, old number pad, phone/landscape/tablet adaptations. |
| 2 | `mobile-phone-refinement.css?v=20260621-2` | Phone portrait HUD/playfield/joystick refinements. |
| 3 | `mobile-start-hotfix.css?v=20260621-4` | Start-screen mobile hotfixes, much of it for removed legacy start markup. |
| 4 | `mobile-resolution-hotfix.css?v=20260621-5` | Phone question-dialog and board scale balancing. |
| 5 | `mobile-native-answer.css?v=20260621-6` | Native answer input and submit-button mobile behavior. |
| 6 | `mobile-final-layout.css?v=20260621-7` | Late portrait gameplay layout and high-specificity board/joystick overrides. |

Active loaded CSS lines before: 8,037.

## After CSS Loading Map

Runtime stylesheet requests verified by Playwright:

```text
/styles.css?v=20260619-6
/ui/foundation.css?v=20260628-1
/ui/mobile-overrides.css?v=20260628-1
/leaderboard.css?v=20260622-1
/arcade-foundation.css?v=20260628-1
/main-menu.css?v=20260628-4
/ui/secondary-screens.css?v=20260628-1
/ui/motion/motion.css?v=20260629-1
```

Root mobile hotfix CSS files now loaded at runtime: 0.

Active loaded CSS lines after: 7,923.

The original root mobile files remain in the repository as legacy reference sources. They were not deleted in this phase because deletion should be handled separately after verifying old maintenance scripts and historical docs that still reference them.

## Consolidation Performed

- Inlined the verified legacy mobile hotfix cascade into `ui/mobile-overrides.css` in the original order.
- Removed `@import` loading of:
  - `mobile-enhancements.css`
  - `mobile-phone-refinement.css`
  - `mobile-start-hotfix.css`
  - `mobile-resolution-hotfix.css`
  - `mobile-native-answer.css`
  - `mobile-final-layout.css`
- Removed obsolete mobile pseudo-element icon drawing for HUD pause/sound/fullscreen controls from the active mobile layer. These controls now render through the SVG icon system.
- Added a Node test that prevents reintroducing `@import` for root mobile hotfix CSS into `ui/mobile-overrides.css`.

## Removed Files

None.

## Files Stopped Loading At Runtime

The following root CSS files are no longer runtime-loaded by `ui/mobile-overrides.css`:

- `mobile-enhancements.css`
- `mobile-phone-refinement.css`
- `mobile-start-hotfix.css`
- `mobile-resolution-hotfix.css`
- `mobile-native-answer.css`
- `mobile-final-layout.css`

## Known Overlapping Selectors

Verified duplicate-selector clusters still exist and should be addressed later:

| Selector family | Active files | Risk |
| --- | --- | --- |
| `.game-shell`, `.stage`, `#game-canvas` | `styles.css`, `ui/mobile-overrides.css`, `arcade-foundation.css` | High mobile gameplay layout risk. |
| `.hud`, `.hud-actions`, `.hud-group-main` | `styles.css`, `ui/mobile-overrides.css`, `arcade-foundation.css` | High HUD cascade risk. |
| `.metric`, `.metric-label`, `.metric strong` | `styles.css`, `ui/mobile-overrides.css`, `arcade-foundation.css` | Medium HUD typography/alignment risk. |
| `.dialog`, `.dialog-inner`, `.dialog h1` | `styles.css`, `ui/mobile-overrides.css` | Medium question-dialog mobile risk. |
| `.difficulty-options`, `.difficulty-field` | `styles.css`, `ui/mobile-overrides.css`, `arcade-foundation.css`, `main-menu.css` | Medium sheet/game settings overlap. |
| `.menu-sheet`, `.menu-sheet-inner` | `main-menu.css`, `ui/secondary-screens.css` | Medium secondary-screen ownership risk. |
| `.leaderboard-panel` | `leaderboard.css`, `ui/secondary-screens.css` | Medium dialog layout risk. |
| `.results-panel`, `.results-grid`, `.score-breakdown` | `arcade-foundation.css`, `ui/secondary-screens.css` | Medium results-screen risk. |

Naive selector scan found 102 duplicate selector entries across the active stylesheet set. This is lower-risk after this phase because the mobile hotfixes now have one loading boundary, but it is not yet a true CSS ownership split.

## Important Rules

Remaining `!important` rules are concentrated in:

- `ui/mobile-overrides.css`: mobile portrait gameplay layout, native answer behavior, and legacy mobile hiding rules.
- `arcade-foundation.css`: HUD/grid overrides and mobile gameplay layout.
- `styles.css`: reduced motion and one legacy display override.
- `leaderboard.css`: mobile leaderboard layout.
- `ui/secondary-screens.css`: mobile secondary-screen panel overrides.
- `ui/motion/motion.css`: reduced-motion animation shutdown.

This phase did not broadly remove `!important` rules because the high-risk rules are currently protecting phone portrait gameplay layout. Removing them safely requires visual-diff coverage against known-good gameplay sessions.

## Mobile-Only Overrides

Mobile-only behavior is now centralized at runtime through `ui/mobile-overrides.css`, with additional later overrides in:

- `arcade-foundation.css`: current HUD/gameplay responsive authority.
- `main-menu.css`: current home hub responsive authority.
- `ui/secondary-screens.css`: current dialogs/results/leaderboard responsive authority.
- `ui/motion/motion.css`: motion behavior for coarse pointers and reduced motion.

## Start-Screen-Only Overrides

Current start/home behavior remains primarily owned by `main-menu.css`. Legacy start-screen selectors remain inside `ui/mobile-overrides.css` only because they were inherited from the old hotfix cascade. Known obsolete candidates include:

- `.start-layout`
- `.start-poster-frame`
- `.start-poster`
- `.start-graphic`
- `.screen-stats`
- `.name-form`
- `.time-limit-setting`

These were not removed in this phase because some selectors also exist in `styles.css`, and a deletion pass should be done with CSS coverage plus visual diffs.

## Gameplay-Only Overrides

Gameplay layout still depends on these active selector families:

- `.game-shell`
- `.stage`
- `#game-canvas`
- `.hud`
- `.hud-group-main`
- `.hud-actions`
- `.metric-*`
- `.progress-wrap`
- `.dialog`
- `.dialog-inner`
- `#answer-form`
- `#answer-input`
- `#submit-answer`

The safest future refactor is to move gameplay layout ownership into `arcade-foundation.css` and leave `ui/mobile-overrides.css` as only compatibility glue.

## Obsolete Or Superseded Candidates

Not deleted in this phase:

- Root mobile hotfix CSS files: now runtime-obsolete, retained as legacy sources.
- Old mobile pseudo-element icon drawing: removed from the active inlined layer.
- Legacy start-screen classes listed above: likely obsolete, but retained until a focused coverage pass proves no runtime dependency.
- Old `.control-field`, `.control-options`, `.mobile-number-pad` styling: probably legacy; current mobile JS removes old controls and native answer input is active.

## Verification

Automated:

| Check | Result |
| --- | --- |
| Build equivalent: `node --check` scripts | Passed |
| `node --test tests/kaflul-systems.test.js` | Passed, 16/16 |
| `playwright test tests/game.spec.js` | Passed, 15 passed, 1 skipped |
| `git diff --check` | Passed |
| Runtime CSS request check | Passed, no root mobile hotfix CSS loaded |

Viewport and screen QA:

| Viewport | Result |
| --- | --- |
| 390x844 portrait | Passed |
| 430x932 portrait | Passed |
| 844x390 landscape | Passed |
| 1280x720 desktop | Passed |
| 1440x900 desktop | Passed |

Verified screens:

- Home screen
- Mode sheet
- Difficulty sheet
- Settings sheet
- Game canvas
- Question dialog
- Pause screen
- Results screen
- Leaderboard

Screenshots were written outside the repository to:

```text
/private/tmp/kaflul-phase8-6-css-qa
```

Representative screenshot files:

```text
/private/tmp/kaflul-phase8-6-css-qa/390x844-portrait-home.png
/private/tmp/kaflul-phase8-6-css-qa/390x844-portrait-game-canvas.png
/private/tmp/kaflul-phase8-6-css-qa/844x390-landscape-question-dialog.png
/private/tmp/kaflul-phase8-6-css-qa/1280x720-desktop-leaderboard.png
/private/tmp/kaflul-phase8-6-css-qa/1440x900-desktop-home.png
```

## Remaining CSS Debt

- Active CSS still has broad overlap between `styles.css`, `ui/mobile-overrides.css`, and `arcade-foundation.css`.
- `ui/mobile-overrides.css` now contains legacy content inline; this is safer at runtime but temporarily duplicates source content that still exists in the root legacy files.
- Root legacy CSS files should be deleted only after old tooling and docs are updated.
- `!important` rules remain high in phone portrait gameplay layout.
- Start-screen legacy selectors should be removed in a later focused pass.
- Gameplay HUD and question-dialog ownership should eventually move fully out of legacy mobile overrides.

## Acceptance Status

- Fewer root-level mobile hotfix files loaded: passed, reduced from 6 imported root CSS files to 0.
- No functional regression found: passed in smoke tests.
- No major visual regression found: passed in screenshot QA.
- Mobile portrait fits: passed.
- Game starts: passed.
- Question dialog works: passed.
- Results screen works: passed.
- Tests pass: passed.
- Screenshots pass: passed.
