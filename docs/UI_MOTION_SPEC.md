# Kaflul UI Motion Spec

Date: 2026-06-29
Phase: 6 motion system only

## Scope

This document defines the shared motion language for the completed Kaflul UI. It does not approve layout redesign, gameplay rule changes, new character animation assets, or later-phase implementation work.

Production owners:

- Motion CSS: `ui/motion/motion.css`
- Motion controller: `ui/motion/motion-system.js`
- Integration points: `game.js`
- Verification: `tools/phase6_motion_audio_verification.mjs`

## Principles

- Motion supports state clarity first, decoration second.
- Use transform and opacity for UI feedback.
- Avoid animated layout properties such as width, height, top, left, margin, padding, and grid changes.
- Avoid large animated backdrop filters.
- Do not animate hidden screens.
- Cap DOM particles to 10 per event.
- Keep gameplay canvas visibility and input timing unchanged.
- Respect `prefers-reduced-motion: reduce`.
- Character reactions must go through the Phase 3 animation adapter and must fall back to approved static assets.

## Shared Tokens

| Token | Value | Use |
| --- | ---: | --- |
| `--kf-motion-duration-instant` | 80ms | Immediate state response before reduced-motion override. |
| `--kf-motion-duration-press` | 110ms | Button press compression. |
| `--kf-motion-duration-release` | 150ms | Button release rebound. |
| `--kf-motion-duration-enter` | 240ms | Screens, modals, and sheets entering. |
| `--kf-motion-duration-exit` | 120ms | Screens, modals, and sheets exiting. |
| `--kf-motion-duration-feedback` | 620ms | HUD, badge, lock, and mission feedback. |
| `--kf-motion-duration-reward` | 860ms | Rewards, combo celebration, and new record. |
| `--kf-motion-ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Natural settle. |
| `--kf-motion-ease-in` | `cubic-bezier(0.55, 0, 1, 0.45)` | Quick exit. |
| `--kf-motion-ease-overshoot` | `cubic-bezier(0.2, 1.22, 0.22, 1)` | Tactile pop. |
| `--kf-motion-scale-press` | 0.982 | Button down limit. |
| `--kf-motion-scale-release` | 1.012 | Button release limit. |
| `--kf-motion-scale-overshoot` | 1.035 | Non-reward pop limit. |
| `--kf-motion-particle-limit` | 10 | DOM particle cap. |

Reward effects may briefly reach `scale(1.045)`. Character tap/select may briefly use a larger visual squash or lift, but must stay inside the existing character safe area.

## Event Map

| Event | Class | Duration | Behavior |
| --- | --- | ---: | --- |
| `buttonPress` | `.kf-motion-press` | 110ms | Small downward compression. |
| `buttonRelease` | `.kf-motion-release` | 150ms | Small rebound back to neutral. |
| `screenEnter` | `.kf-motion-screen-enter` | 240ms | Opacity in with slight upward settle. |
| `screenExit` | `.kf-motion-screen-exit` | 120ms | Opacity out with slight downward move. |
| `modalOpen` | `.kf-motion-modal-open` | 240ms | Same shell entrance pattern as screen enter. |
| `modalClose` | `.kf-motion-modal-close` | 120ms | Same shell exit pattern as screen exit. |
| `sheetOpen` | `.kf-motion-sheet-open` | 240ms | Sheet entrance without layout shift. |
| `sheetClose` | `.kf-motion-sheet-close` | 120ms | Sheet exit before hidden state. |
| `tabChange` | `.kf-motion-tab-change` | 620ms | Compact pop on selected tab or option. |
| `characterSelect` | `.kf-motion-character-select` | 520ms | Selected character lift and settle, optional capped particles. |
| `characterTap` | `.kf-motion-character-tap` | 420ms | Squash/rebound tap reaction, adapter state requested when supported. |
| `reward` | `.kf-motion-reward` | 860ms | Celebration pop, optional capped particles. |
| `scoreCountUp` | `.kf-motion-score-count` | 620ms | Score label pop. |
| `comboMilestone` | `.kf-motion-combo-milestone` | 860ms | Combo celebration. |
| `missionComplete` | `.kf-motion-mission-complete` | 620ms | Mission card confirmation with capped particles. |
| `lifeLost` | `.kf-motion-life-lost` | 620ms | Short deny shake. |
| `worldTransition` | `.kf-motion-world-transition` | 760ms | Stage-level visual pulse on level/world entry. |
| `badgeAppearance` | `.kf-motion-badge` | 620ms | Badge or notification pop. |
| `lockedFeedback` | `.kf-motion-locked` | 620ms | Locked/denied shake. |
| `newRecord` | `.kf-motion-new-record` | 860ms | Reward pattern for new best score. |

## Integration Rules

- Global press/release feedback is delegated to buttons, role buttons, submit buttons, and radio/checkbox labels.
- Programmatic open/close calls should use `KaflulMotionSystem.show` and `KaflulMotionSystem.hideAfter`.
- Gameplay HUD feedback maps existing CSS hooks to shared event names:
  - `hud-score-change` -> `scoreCountUp`
  - `hud-combo-milestone` -> `comboMilestone`
  - `hud-life-loss` -> `lifeLost`
  - `hud-mission-progress` -> `missionComplete`
  - `hud-mission-complete` -> `missionComplete`
  - `hud-level-progress` -> `badgeAppearance`
- `missionComplete`, `reward`, and `newRecord` may emit DOM particles through the shared controller.
- Canvas gameplay particles remain separate and are capped in reduced-effect paths.

## Character Reactions

Character-specific motion must use the Phase 3 animation adapter first. Current approved character states are still limited:

| Character | Approved states |
| --- | --- |
| Bifly | `idle`, `eat` |
| Nabatick | `idle`, `eat` |

Unsupported states must fall back to static approved PNGs. Phase 6 may use UI-level CSS feedback for tap and selection, but must not represent it as a real character animation state.

Missing states for both characters:

- `blink`
- `tap`
- `selected`
- `excited`
- `worried`
- `victory`
- `defeat`
- `hit`

## Reduced Motion

When the system preference is `prefers-reduced-motion: reduce`, or when `html.kf-reduced-motion` is present:

- Motion durations collapse to 1ms.
- Decorative menu enemy loops stop.
- Decorative menu particles stop.
- Hero route and character idle loops stop.
- DOM particles are not emitted.
- State changes remain visible through text, selection state, focus, and static visual styling.
- Dialogs, sheets, and modals remain usable.

## Performance Limits

- Target 60 FPS on common mobile hardware.
- Verification safety floor is 30 FPS during scripted motion profiling.
- Do not start duplicate animation loops for hidden screens.
- Remove temporary particle nodes after their animation completes.
- Do not use timers that continue indefinitely while the app is on the menu, hidden overlay, or reduced-motion state.
- Keep reward and feedback animations under 900ms unless a later phase explicitly revises the motion spec.
- The gameplay canvas render loop may skip update/render work while the start menu fully covers the canvas. This is a performance optimization only and must not change gameplay once the game starts.
- Coarse-pointer profiles may disable decorative menu particle loops while retaining static state communication.

## Phase 8.9 Stabilization Notes

Phase 8.9 does not turn the existing UI motion layer into a full final motion art system. It stabilizes the current hooks, verifies event names, and keeps the implementation honest about missing character-animation assets.

Verified motion events:

- `buttonPress`
- `modalOpen`
- `modalClose`
- `sheetOpen`
- `sheetClose`
- `tabChange`
- `characterSelect`
- `lockedFeedback`
- `scoreCountUp`
- `comboMilestone`
- `missionComplete`
- `lifeLost`
- `newRecord`

Implementation guardrails verified in Phase 8.9:

- Event names used by production UI controls must exist in the relevant controller.
- Reduced motion collapses event duration and blocks DOM particle emission.
- HUD feedback events are defined as shared motion events rather than one-off layout animations.
- Character tap/selection may use UI-level feedback only. It must not be represented as a real character animation state unless an approved asset exists.

## Acceptance Checks

Phase 6 verification must confirm:

- Controllers are available on `window.KaflulMotionSystem`.
- Required viewport screenshots remain usable.
- No new console or runtime errors.
- No document overflow in required viewports.
- No animations target elements inside `[hidden]` surfaces.
- DOM particles stay within the configured cap.
- Reduced-motion blocks nonessential loops and particle emission.
- RTL document state remains `lang="he"` and `dir="rtl"`.
