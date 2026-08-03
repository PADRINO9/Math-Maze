# Kaflul UI Next Level — Master Specification

## 1. Purpose

This document is the single source of truth for the Kaflul interface overhaul.

Kaflul is an original Hebrew educational arcade game that combines maze navigation, multiplication practice, pursuit by black enemies, selectable characters, scoring, missions, progression, and leaderboards.

The objective is to transform the current presentation from a web-style interface around a game canvas into a cohesive, premium, mobile-first game interface with the polish, hierarchy, tactile feedback, motion discipline, and consistency expected from a leading commercial mobile game.

Clash Royale may be used only as a quality benchmark for polish, hierarchy, responsiveness, tactile interactions, motion quality, perceived depth, and production discipline.

Do not copy Clash Royale or any other game.

## 2. Originality rules

Do not copy or closely imitate:

- layouts
- navigation structures
- button shapes
- panel designs
- icons
- fonts
- colors
- chests
- cards
- arenas
- characters
- visual effects
- reward containers
- sound design
- screen compositions

Kaflul must develop a completely original visual language based on:

- mazes
- multiplication
- arcade pursuit
- Bifly
- Nabatick
- the black enemies
- the official Kaflul logo
- the four existing worlds
- playful heroes versus threatening enemies

## 3. Existing product context

The current product is a browser game deployed on Vercel.

The current implementation includes:

- HTML shell
- CSS responsive layouts
- canvas gameplay
- JavaScript gameplay systems
- Bifly and Nabatick
- black enemies with multiple expressions
- Arcade and Adventure modes
- five difficulty levels
- four worlds
- missions
- scoring
- combo multipliers
- local save data
- local leaderboard logic
- public leaderboard integration point
- mobile-specific behavior
- accumulated mobile CSS hotfixes
- accumulated responsive overrides

Important files may include:

- `index.html`
- `styles.css`
- `main-menu.css`
- `leaderboard.css`
- `arcade-foundation.css`
- `mobile-*.css`
- `game.js`
- `kaflul-systems.js`
- `poster-loader.js`
- assets under `assets/`

The exact repository structure must be audited before implementation.

## 4. Product goal

The interface must feel like a real game rather than a website containing a game.

The player should perceive:

- a living game world
- clear character identity
- strong visual hierarchy
- tactile buttons
- polished transitions
- responsive feedback
- meaningful progression
- consistent iconography
- intentional motion
- strong mobile ergonomics
- original Kaflul personality

## 5. Non-negotiable constraints

Do not change existing gameplay rules unless fixing a verified bug.

Preserve:

- question generation behavior
- scoring rules
- difficulty definitions
- game modes
- character-selection behavior
- movement behavior
- enemy behavior
- save schema
- stored player progress
- leaderboard logic
- progression logic
- mission logic
- win and loss conditions

Any gameplay change must be:

1. justified by a verified defect
2. documented
3. isolated
4. tested
5. explicitly reported

Additional constraints:

- Work in small, reviewable phases.
- Do not perform a large unreviewable rewrite.
- Do not begin a later phase before the current phase is verified.
- Keep every phase in a separate commit.
- Do not use emoji or Unicode symbols as final production icons.
- Do not insert generic placeholder art into the production experience.
- Do not hide missing art requirements with random gradients or shapes.
- Mobile portrait is the primary design target.
- Desktop and landscape must adapt the same design system.
- Hebrew RTL must remain correct.
- The game must remain playable after every phase.

## 6. Current weaknesses to investigate

The audit must verify and document:

- accumulated CSS overrides
- duplicated layout rules
- conflicting media queries
- obsolete mobile hotfixes
- inconsistent visual hierarchy
- web-dashboard-style glass panels
- generic CSS-gradient buttons
- Unicode and emoji icons
- inconsistent component states
- static character presentation
- weak character reactions
- weak transition hierarchy
- inconsistent typography
- inconsistent shadows and borders
- excessive or inconsistent glow
- overloaded gameplay HUD
- weak primary versus secondary action distinction
- missing animation state architecture
- missing asset manifest
- missing UI sound manifest
- missing visual-regression coverage
- divergence between mobile and desktop behavior
- unnecessary asset loading
- possible layout shifts
- possible canvas/UI scaling conflicts
- accessibility risks
- performance risks

## 7. Target experience principles

### 7.1 The interface belongs to the world

Panels, buttons, badges, progress bars, navigation, and dialogs must feel like objects from the Kaflul universe.

They should visually relate to:

- maze walls
- multiplication symbols
- collectible gems
- world materials
- character colors
- black-enemy eyes and silhouettes
- arcade energy

### 7.2 One dominant action per screen

Each screen must communicate one obvious primary action.

Secondary actions must not compete visually with the primary action.

### 7.3 Characters are the emotional center

Bifly and Nabatick must not appear only as static decorative PNG files.

The architecture should support:

- idle
- blink
- tap reaction
- selected
- excited
- worried
- victory
- defeat
- eat
- hit

The implementation must support graceful fallback when only static assets are available.

### 7.4 Motion communicates state

Motion should explain:

- selection
- confirmation
- success
- danger
- reward
- progression
- navigation
- hierarchy

Motion must not be random decoration.

### 7.5 Mobile-first clarity

The home screen must fit without unwanted scrolling on supported mobile portrait sizes.

Touch targets must be comfortable.

Text must remain readable.

The gameplay canvas must remain visually dominant.

## 8. Target screen map

### 8.1 Home hub

Required regions:

- compact top player bar
- central living hero scene
- dominant Play button
- compact pre-game summary
- bottom navigation

Recommended bottom navigation:

- משחק
- דמויות
- התקדמות
- אלופים

### 8.2 Hero screen

Required behavior:

- large selected character
- character name
- short personality description
- previous and next navigation
- selected state
- confirmation feedback
- idle animation
- tap reaction
- entrance animation
- persistent character selection
- personal best by character only when supported by real data

### 8.3 Pre-game sheet

Purpose:

- confirm mode
- confirm difficulty
- confirm selected character
- communicate important rules
- start the session

### 8.4 Gameplay HUD

Always-visible information:

- lives
- score
- combo
- level or wave progress
- current mission

Secondary information should move to:

- level intro
- pause screen
- results screen

### 8.5 Pause screen

Include:

- resume
- restart where safe
- sound
- settings
- return to menu

### 8.6 Results screen

Prioritize:

- emotional result
- final score
- new record
- rank
- accuracy
- combo
- progress
- retry
- return to menu
- leaderboard access

### 8.7 Leaderboard screen

Include:

- readable ranking
- current-player highlight
- filters
- empty state
- loading state
- error state
- local/public distinction where relevant

### 8.8 Progress screen

May include only real stored data:

- world progression
- unlocked difficulty levels
- personal bests
- milestones
- future achievements only when implemented

## 9. Design system requirements

Create a maintainable design system with:

- color tokens
- typography tokens
- spacing tokens
- radius tokens
- border tokens
- depth tokens
- shadow tokens
- glow tokens
- animation-duration tokens
- easing tokens
- z-index tokens
- responsive tokens
- safe-area tokens
- touch-target tokens

### 9.1 Button variants

At minimum:

- primary-play
- secondary
- icon
- navigation
- danger
- locked
- loading

Each must support:

- idle
- hover
- focus-visible
- pressed
- disabled
- loading
- locked

### 9.2 Panels

At minimum:

- HUD panel
- menu panel
- modal panel
- reward panel
- compact badge panel

Avoid making every surface glass.

### 9.3 Icon system

Create or integrate an original SVG icon system for:

- settings
- sound on
- sound off
- leaderboard
- profile
- character
- mode
- difficulty
- back
- close
- lives
- score
- combo
- mission
- world
- progress
- lock
- play
- pause

Do not use emoji or Unicode symbols as final icons.

### 9.4 Typography

Typography must:

- support Hebrew
- remain readable on small screens
- provide clear hierarchy
- use display styling only where appropriate
- avoid excessive outlines and glows
- remain legible against animated backgrounds

## 10. Recommended technical architecture

Suggested structure:

```text
ui/
  tokens.css
  typography.css
  layout.css
  components/
    buttons.css
    panels.css
    navigation.css
    badges.css
    progress.css
    dialogs.css
    hud.css
  screens/
    home.css
    heroes.css
    pregame.css
    gameplay.css
    pause.css
    results.css
    leaderboard.css
    progress.css
  motion/
    motion-system.js
    screen-transitions.js
    micro-interactions.js
  assets/
    asset-manifest.js
  sounds/
    ui-sound-controller.js
```

Do not force this exact structure if it conflicts with the repository architecture.

Any alternative must be documented and justified.

## 11. Asset architecture

Create an asset manifest describing:

- asset id
- file path
- type
- screen usage
- required dimensions
- preload priority
- fallback asset
- animation state
- source status
- licensing status if external assets are introduced

Suggested categories:

```text
assets/
  characters/
    bifly/
    nabatick/
  enemies/
  ui/
    buttons/
    panels/
    icons/
    badges/
    progress/
  worlds/
    ice/
    lava/
    ancient/
    diamond/
  effects/
  audio/
```

Do not move existing production assets without verifying all references.

## 12. Character animation architecture

Create an adapter capable of supporting:

- static image fallback
- sprite sheet
- layered PNG rig
- Rive
- Spine

The project must not depend on paid software.

Static and sprite-sheet implementations must remain supported.

Recommended layers where possible:

- body
- eyes
- pupils
- eyelids
- eyebrows
- mouth
- highlights
- shadow
- optional effect layer

## 13. Motion system

Define a shared motion language for:

- button press
- screen enter
- screen exit
- modal open
- modal close
- sheet open
- sheet close
- character select
- character tap
- reward
- score count-up
- combo milestone
- mission complete
- life lost
- world transition
- badge appearance
- locked feedback

Use:

- anticipation
- controlled overshoot
- transform
- opacity
- squash and stretch where appropriate
- subtle parallax
- meaningful particles

Avoid:

- random bouncing
- permanent animation on every element
- excessive glow
- expensive blur animation
- motion that harms readability
- motion that obscures touch targets

Respect `prefers-reduced-motion`.

## 14. UI audio system

Create a UI sound layer separate from gameplay sound generation.

Required events:

- button press
- panel open
- panel close
- tab change
- character selected
- mode selected
- difficulty selected
- locked action
- notification
- reward
- new record

Respect:

- mute state
- browser autoplay restrictions
- mobile restrictions
- sensory preferences

Do not introduce copyrighted or unlicensed audio.

## 15. Responsive requirements

Required verification sizes:

- 390×844 portrait
- 430×932 portrait
- 844×390 landscape
- 1280×720 desktop
- 1440×900 desktop

Also consider:

- safe-area insets
- browser UI height changes
- virtual keyboard
- orientation changes
- coarse pointer
- hover availability
- high device pixel ratio
- reduced-effects mode

The home screen must not require accidental scrolling.

No important control may be clipped.

## 16. Accessibility requirements

Maintain or improve:

- semantic buttons
- labels
- focus-visible states
- keyboard navigation
- dialog focus handling
- Escape behavior
- readable contrast
- reduced motion
- correct RTL
- meaningful accessible names
- minimum touch-target sizes
- no information conveyed only by color

## 17. Performance requirements

Target:

- 60 FPS for UI animations on common mobile hardware
- no console errors
- no repeated unnecessary asset decoding
- no major layout shifts
- no unbounded particle creation
- no full-screen animated blur unless proven safe
- no unnecessary high-resolution image loading
- no duplicate event listeners
- no animation loops running for hidden screens

Prefer:

- transform and opacity
- lazy loading
- selective preloading
- image atlases where useful
- requestAnimationFrame-based coordinated motion
- efficient canvas rendering
- reduced effects on low-capability devices

## 18. Testing requirements

Test:

- home screen rendering
- no home-screen scrolling
- no clipped controls
- RTL layout
- mode selection
- difficulty selection
- character selection
- nickname persistence
- start game
- return to menu
- pause and resume
- question dialog
- results screen
- leaderboard
- reduced motion
- asset-load fallback
- local save migration
- mobile portrait
- mobile landscape
- desktop
- no console errors

Add visual-regression screenshots for major screens.

## 19. Documentation requirements

Maintain:

- `docs/UI_NEXT_LEVEL_MASTER_SPEC.md`
- `docs/UI_NEXT_LEVEL_AUDIT.md`
- `docs/UI_NEXT_LEVEL_PLAN.md`
- `docs/UI_ASSET_REQUIREMENTS.md`
- `docs/UI_SCREEN_MAP.md`
- `docs/UI_MOTION_SPEC.md`
- `docs/UI_SOUND_SPEC.md`
- `docs/UI_QA_REPORT.md`

Only create a document when its phase requires it.

## 20. Phase boundaries

### Phase 0 — Audit only

Deliver:

- architecture audit
- screen map
- CSS conflict map
- asset inventory
- missing-asset requirements
- implementation plan
- baseline screenshots
- risk register

### Phase 1 — Foundation and cleanup

Deliver:

- consolidated CSS architecture
- design tokens
- component foundation
- responsive foundation
- icon infrastructure
- no major screen redesign yet

### Phase 2 — Home hub

Deliver:

- redesigned home screen
- living central hero scene
- player bar
- primary Play action
- pre-game summary
- bottom navigation
- responsive behavior

### Phase 3 — Hero screen

Deliver:

- dedicated hero gallery
- Bifly and Nabatick browsing
- character states
- persistent selection
- truthful character performance display where data exists

### Phase 4 — Gameplay HUD

Deliver:

- simplified HUD
- score animation
- combo feedback
- mission feedback
- life-loss feedback
- preserved canvas visibility

### Phase 5 — Secondary screens

Deliver:

- pre-game sheet
- mode selection
- difficulty selection
- settings
- pause
- results
- leaderboard
- progress screen where supported

### Phase 6 — Motion and audio

Deliver:

- shared motion system
- transitions
- micro-interactions
- character animation adapter
- UI sound controller
- reduced-motion behavior

### Phase 7 — QA, performance, and polish

Deliver:

- automated tests
- visual-regression suite
- responsive verification
- accessibility verification
- performance report
- final screenshots
- unresolved-issue list

## 21. End-of-phase protocol

At the end of every implementation phase:

1. run the project
2. run automated tests
3. inspect desktop screenshots
4. inspect mobile portrait screenshots
5. inspect mobile landscape screenshots
6. check browser console
7. check RTL rendering
8. verify saved selections
9. list changed files
10. list removed files
11. list remaining risks
12. update relevant documentation
13. create one clearly named commit
14. do not begin the next phase
15. do not push unless explicitly instructed

## 22. Definition of done

The overhaul is complete only when:

- the interface feels like one cohesive game
- no final production icons are emoji or Unicode
- mobile portrait is polished
- desktop is polished
- the game remains fully playable
- all current core systems remain intact
- the HUD no longer resembles a web dashboard
- character selection feels alive
- interactions provide tactile feedback
- motion is consistent
- visual assets are managed systematically
- tests pass
- screenshots are reviewed
- performance is acceptable
- documentation matches reality
- no known critical regression remains
