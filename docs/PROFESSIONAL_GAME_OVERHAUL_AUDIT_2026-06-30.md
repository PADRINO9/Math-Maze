# Kaflul Professional Game Overhaul Audit

Date: 2026-06-30
Scope: code study, local browser review, focused online research, and implementation plan.

No production code was changed in this audit.

## Executive Summary

The game is technically functional, but it does not yet feel like a premium mobile game. The main problem is not one broken CSS rule. The current experience is the result of many layered fixes: a static web-style home screen, multiple overlapping responsive systems, a canvas game that renders dense neon blocks, and characters that are mostly static images with only simple transform/pulse behavior.

The correct next step is not another cosmetic hotfix. The correct next step is a phased rebuild of the presentation layer while preserving the existing math logic, scoring, save schema, modes, difficulties, leaderboard logic, and core gameplay rules.

## What I Verified Locally

Local URL tested: `http://localhost:5178/`

Viewports inspected:

- Desktop default browser viewport.
- Mobile portrait 390x844.
- Character gallery on mobile.
- Mobile gameplay after starting a session.
- Question overlay during gameplay.

Technical checks:

- JavaScript syntax checks passed for production JS and verification scripts using the bundled Node runtime.
- Node unit tests passed: 18/18 in `tests/kaflul-systems.test.js`.
- Full `npm run build` could not be run directly because `npm` is not available in the shell PATH. I used the bundled Node executable for equivalent syntax checks.

## Current Visual Findings

### Home Screen

The home screen is overcrowded, especially on mobile portrait.

Observed issues:

- The start CTA visually dominates too much and sits on top of the central character/world composition.
- The progress card, CTA, pregame button, control strip, and bottom nav are packed into the bottom third.
- Text and chips inside the hero area sit over the character art.
- Desktop also feels like layered panels over a poster rather than a designed game hub.
- The UI uses many glass-card surfaces, making it feel closer to a dashboard than a game.

### Character Selection

The gallery has a useful structure, but the characters are not alive yet.

Observed issues:

- Bifly and Nabatick only have approved static states: `idle` and `eat`.
- Missing character states are already documented by the adapter: `blink`, `tap`, `selected`, `excited`, `worried`, `victory`, `defeat`, `hit`.
- Tapping/selecting a character triggers UI motion, not a real character expression.
- The current system can support richer states, but the asset layer is missing the actual animation frames/rigs.

### Gameplay Screen

The gameplay screen works, but the maze does not read as a premium maze arena.

Observed issues:

- The maze is rendered as repeated rounded neon wall cells, so it feels like a tile pattern instead of a crafted arena.
- The background decoration is very dense and competes with player/enemy readability.
- Player and enemies are visually small relative to the field and can get lost in the glow.
- The HUD covers the top of the maze with several dense elements.
- The question dialog is functional, but it looks like an HTML form placed over the game rather than an integrated game interaction.

### Code Structure

Important structural findings:

- `game.js` is more than 5,000 lines and owns gameplay state, rendering, UI syncing, dialogs, persistence, leaderboard logic, input, scoring flow, and menu behavior.
- Current presentation CSS is spread across `styles.css`, `ui/foundation.css`, `ui/mobile-overrides.css`, `leaderboard.css`, `arcade-foundation.css`, `main-menu.css`, `ui/secondary-screens.css`, and `ui/motion/motion.css`.
- `ui/mobile-overrides.css` explicitly contains legacy mobile hotfix layers and many `!important` rules.
- Runtime state is split across `data-game-state`, `start-screen-open`, `question-open`, `touch-layout`, and other classes/datasets.
- Automated reports currently detect bounds/overflow, but they do not judge visual crowding, hierarchy, character liveliness, or whether the result feels like a real game.

## Online Research Notes

Sources reviewed:

- Supercell official Clash Royale page: https://supercell.com/en/games/clashroyale/
- Apple Human Interface Guidelines index and related platform pages: https://developer.apple.com/design/human-interface-guidelines/
- Apple Games developer page: https://developer.apple.com/games/
- Android Games developer center: https://developer.android.com/games?hl=en
- Android game performance/system tracing topics: https://developer.android.com/games/optimize?hl=en
- Android game engine overview: https://developer.android.com/games/engines/engines-overview?hl=en
- MDN `requestAnimationFrame`: https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame
- MDN Canvas basic animations: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Basic_animations
- web.dev animation performance: https://web.dev/articles/animations-and-performance?hl=en
- web.dev compositor-only animation guidance: https://web.dev/articles/stick-to-compositor-only-properties-and-manage-layer-count?hl=en
- Phaser overview: https://docs.phaser.io/phaser/getting-started/what-is-phaser
- PixiJS introduction: https://pixijs.com/8.x/guides/getting-started/intro

Key takeaways applied to Kaflul:

- Use Clash Royale only as a benchmark for polish, hierarchy, immediate readability, strong characters, progression, and mobile-first confidence. Do not copy its layout, shapes, colors, cards, arenas, or characters.
- A professional mobile game screen should have one dominant action and a clear visual center.
- Animation quality depends on purposeful state changes and stable frame timing, not random loops.
- Canvas animation should use `requestAnimationFrame` with time-based progression.
- UI animation should mainly use transform and opacity; layout/paint-heavy animation should be avoided.
- Android game quality focuses heavily on frame consistency, load speed, thermal behavior, touch-to-display latency, and smooth rendering.
- Phaser/PixiJS are valid future options for a richer 2D rendering layer, but a full engine migration should not be the first move unless we decide the current canvas architecture cannot reach the target.

## Proposed Direction

The next implementation should be a professional presentation rebuild, not a surface polish pass.

Core principle:

Preserve the current game rules and learning logic. Rebuild how the game looks, feels, animates, and adapts to screens.

## Phase Plan

### Phase 1 - Stabilize UI Ownership

Goal: make the presentation layer safe to change.

Work:

- Create a single source of truth for screen state: start, home hub, character gallery, pregame, playing, question, pause, results, leaderboard.
- Add a visual overlap/hierarchy audit that fails when major visible surfaces collide, not only when the document overflows.
- Document and reduce CSS ownership conflicts before changing layout.
- Keep existing gameplay and save behavior unchanged.

Acceptance:

- Node tests pass.
- Local browser smoke passes.
- Current viewports have machine-readable layout snapshots.
- No save keys, scoring values, modes, difficulties, or leaderboard contracts change.

### Phase 2 - Rebuild The Home Hub

Goal: turn the main screen into a real game hub.

Work:

- Mobile portrait first.
- One primary action: Play.
- Central living character/world scene with enough breathing room.
- Move secondary items into compact sheets or bottom nav flows instead of stacking them all on the first screen.
- Replace dashboard-like glass panel density with a more physical Kaflul game language.
- Keep character, mode, difficulty, nickname, local progress, and leaderboard access.

Acceptance:

- 390x844 and 430x932 fit without visual crowding.
- No CTA/control/progress/nav overlap.
- Character selection is clear.
- Play is always reachable.
- Desktop adapts without becoming a stretched mobile layout.

### Phase 3 - Character Life System

Goal: make Bifly and Nabatick feel alive.

Work:

- Use the existing animation adapter as the contract.
- Add real states for at least `idle`, `blink`, `tap`, `selected`, `excited`, `worried`, `victory`, `defeat`, `hit`, and `eat`.
- If no new assets are approved yet, create a temporary non-final micro-reaction layer using masks/overlays and CSS transforms, clearly marked as temporary.
- Character tap on home should produce a short expression or speech bubble.
- Character selection should show a real expression change, not only a card animation.

Acceptance:

- Selecting a character causes a visible character reaction.
- Tapping a character gives a cute response.
- Missing states are listed explicitly.
- No placeholder art is hidden as final production art.

### Phase 4 - Gameplay Arena Redesign

Goal: make the game field read as a real maze arena.

Work:

- Keep the same maze collision grid, but render walls as connected maze structures instead of isolated glowing pills.
- Reduce background sparkle density.
- Increase readability of player/enemies.
- Add depth: wall edges, lanes, portals/spawns, world material language.
- Keep fixed logical canvas size unless a verified mobile camera decision is made.

Acceptance:

- The first gameplay screenshot clearly reads as a maze.
- Player, enemies, collectibles, and walls are visually distinct.
- HUD does not cover critical routes.
- Question flow still works.

### Phase 5 - Question And HUD Rebuild

Goal: make math interaction feel native to the game.

Work:

- Redesign the question overlay as a game interaction, not a form popup.
- Improve numeric answer input reliability and visibility on mobile.
- Separate persistent HUD from temporary mission/answer feedback.
- Make pause, sound, lives, score, combo, and mission readable without overwhelming the arena.

Acceptance:

- Question dialog is immediately visible and interactive.
- Mobile answer entry works reliably.
- Timer is prominent but not stressful/ugly.
- HUD remains compact.

### Phase 6 - Motion, Audio, And Performance Polish

Goal: make the game feel responsive and polished.

Work:

- Add purposeful transitions for home, character selection, start game, answer result, enemy defeat, damage, victory, defeat.
- Keep motion transform/opacity-first.
- Respect reduced motion.
- Profile frame consistency.
- Keep asset loading budget under control.

Acceptance:

- No janky UI transitions on mobile.
- Character and gameplay feedback feel connected.
- No hidden animation loops.
- No console/runtime errors.

### Phase 7 - Mobile App Readiness

Goal: prepare for Android/iOS later without locking into the wrong architecture now.

Work:

- Decide whether current canvas remains enough, or whether to migrate rendering to PixiJS/Phaser.
- Define asset formats for sprites/rigs.
- Build viewport rules for mobile portrait, landscape, tablet, and desktop.
- Keep Vercel/web playable while preparing native wrappers or future ports.

Acceptance:

- Clear recommendation: keep current web canvas, move to PixiJS, move to Phaser, or later native engine.
- No paid services or external purchases without explicit approval.

## Questions Before Implementation

1. Is the first target still mobile portrait first, with desktop as secondary?
2. For character animation, should I build a temporary no-cost micro-animation layer first, or should we wait for/produce new proper character assets before claiming it is final?
3. Are Bifly and Nabatick both required in the first polished version, or should we perfect one character first and then apply the system to the second?
4. Should I keep all existing gameplay rules exactly as they are during the visual rebuild unless I find a verified bug?

## Recommendation

Start with Phase 1 and Phase 2 only. Do not begin asset generation, paid services, engine migration, or gameplay rule changes without explicit approval.

