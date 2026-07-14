# Kaflul Android Release Roadmap

This roadmap turns the current web game into a mobile-first Android release,
then into a Google Play production submission. The rule for every phase is
simple: do not move forward until the release gate for that phase passes.

## North Star

Kaflul should feel like a real mobile game for kids:

- clear first screen on a phone
- readable maze gameplay
- lively characters with reactions
- fast touch response
- no overlapping UI
- no unnecessary permissions
- offline playable first version
- Android first, iOS later

## Cost Rule

Use free tools and free assets wherever possible. Do not start any paid service,
store registration, paid asset generation, ads SDK, analytics SDK, or cloud
service without explicit approval.

Expected future cost:

- Google Play Developer account: usually a one-time registration fee.
- Apple Developer Program later: usually an annual fee.

## Phase 0 - Project Control And Gates

Goal: make the work measurable before adding more features.

Deliverables:

- this roadmap
- a repeatable release gate command
- documented pass/fail criteria
- no new visual/gameplay scope until the baseline passes

Gate:

- `npm run test:release-gate`
- no browser console errors during manual smoke checks
- mobile viewport is checked before any phase is marked complete

Status: completed on 2026-07-01.

Baseline:

- full release gate passed
- syntax checks passed
- 18 Node system tests passed
- 12 mobile Playwright tests passed
- 11 desktop Playwright tests passed
- 1 desktop-only irrelevant mobile test skipped as expected

## Phase 1 - Professional Mobile Vertical Slice

Goal: one small, polished playable loop that proves the game direction.

Status: active. Mobile controls and HUD slice completed on 2026-07-01.

Gate implementation:

- `tests/phase1_vertical_slice.spec.js` added on 2026-07-01
- release gate now includes the Phase 1 vertical-slice mobile test
- full release gate passed after adding the Phase 1 gate
- Android/PWA app-shell manifest added on 2026-07-01
- question feedback visuals and checks added on 2026-07-01
- mobile joystick and HUD icon checks added on 2026-07-01
- mobile home-screen clarity pass added on 2026-07-01
- mobile maze arena depth pass added on 2026-07-01
- latest full release gate passed with 13 mobile Playwright tests, 11 desktop
  Playwright tests, and 18 Node system tests

Deliverables:

- mobile-first home screen
- two selectable characters
- character selection reactions
- one polished maze arena
- player movement with believable animation
- enemies that are readable and fair
- math question encounter that looks like game UI
- win, lose, retry, and back-to-home flows

Gate:

- release gate passes
- Phase 1 mobile vertical-slice Playwright gate passes
- Pixel-style viewport screenshots reviewed
- no clipped text
- no overlapping buttons or panels
- player and enemy are visible at game start
- question panel is usable with touch

## Phase 2 - Rendering And Animation Upgrade

Goal: move the gameplay presentation toward a real game rendering pipeline.

Preferred path:

- keep the current web stack
- introduce Phaser or PixiJS only if it clearly improves layers, animation, and
  performance
- keep the existing tests working during the migration

Deliverables:

- stable scene/layer model
- sprite/state animation system
- frame-timed movement
- reusable visual effects layer
- asset manifest with production/fallback paths

Gate:

- release gate passes
- mobile FPS remains stable during movement
- no asset 404s
- animation states recover after pause/retry/home navigation

## Phase 3 - Game Feel Pass

Goal: make actions feel satisfying.

Deliverables:

- collect effects
- correct/wrong answer effects
- light screen feedback where appropriate
- character idle, walk, collect, hit, win, lose, and menu states
- enemy state reactions
- basic sound effects with mute control

Gate:

- release gate passes
- sound can be muted
- no motion blocks the core math interaction
- visual effects do not hide the maze or question UI

## Phase 4 - Android App Build

Goal: package the game as a real Android app.

Status: active. Android webDir foundation and debug APK emulator QA completed
on 2026-07-01.

Preferred path:

- Capacitor Android wrapper around the web game
- Android Studio/Gradle build
- stable package name, for example `com.kaflul.mathmaze`
- debug APK for device testing
- release AAB for Google Play

Deliverables:

- Capacitor config - done
- generated Android webDir - done
- Android project folder - done
- app icon - done
- splash screen - done
- fullscreen/orientation decisions - done
- debug APK for Android testing - done
- emulator launch and joystick smoke check - done
- debug install instructions - pending real-device workflow
- signed release AAB instructions - pending

Gate:

- release gate passes before packaging - passed
- Android webDir gate passes - passed
- Android webDir smoke test passes - passed
- app launches on Android emulator - passed
- gameplay joystick responds on Android emulator - passed
- no unexpected permissions - passed for debug APK
- app launches on at least one real Android device when available - pending
- offline launch works on a real Android device - pending
- back button behavior is sane on a real Android device - pending

## Phase 5 - Store Policy And Privacy

Goal: make the game acceptable for Google Play review, especially because the
audience may include children.

Deliverables:

- privacy policy
- data safety answers
- target audience definition
- content rating answers
- families policy review if the app targets children
- no ads in the first release unless explicitly approved
- no tracking SDK in the first release unless explicitly approved

Gate:

- release gate passes
- privacy policy matches actual app behavior
- app does not request unused permissions
- store listing text does not overpromise features

## Phase 6 - Closed Testing

Goal: prove the app works outside the development machine.

Deliverables:

- Google Play internal/closed test build
- tester instructions
- feedback checklist
- bug triage list
- release notes for each build

Gate:

- required Google Play testing path is satisfied for the account type
- critical tester issues fixed
- no launch-blocking crashes
- final release candidate AAB built

## Phase 7 - Production Release On Google Play

Goal: publish a careful first Android release.

Deliverables:

- production AAB
- store listing
- screenshots
- feature graphic
- app icon
- privacy policy link
- staged rollout plan

Gate:

- production access available
- release candidate passes the release gate
- Play Console pre-launch report has no launch-blocking issues
- rollout starts gradually

## Phase 8 - Learn From Android Before iOS

Goal: use real Android feedback before spending effort on App Store polish.

Measure:

- crashes
- reviews
- tester/parent feedback
- completion rate of the first level
- places where kids get stuck
- device-specific layout issues

Decision:

- fix Android quality issues first
- then start iOS/App Store adaptation

## Release Gate Command

Run this after every meaningful phase:

```sh
npm run test:release-gate
```

For faster local iteration:

```sh
npm run test:release-gate:quick
```

The full gate checks syntax, deterministic Node tests, mobile Playwright tests,
and desktop Playwright tests. The quick gate checks syntax, deterministic Node
tests, and mobile Playwright tests.
