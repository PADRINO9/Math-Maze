# Phase 1 Mobile Controls And HUD

Date: 2026-07-01

This step fixed the first gameplay control layer for Android-style touch play.

## Changes

- Restored visible HUD action icons for pause and sound on mobile gameplay.
- Added a visible touch joystick for movement on touch devices.
- Kept swipe movement available while preventing joystick drags from leaking into the stage swipe handler.
- Anchored the joystick to the lower viewport and reset older top/inset rules that stretched it over the maze.
- Hid the joystick during questions, pause, and result overlays.

## Gate Coverage

The Phase 1 vertical-slice Playwright gate now verifies:

- pause and sound icons are visible and non-transparent
- joystick wrapper, base, and knob are visible and unclipped
- joystick is positioned in the lower portion of the mobile viewport
- joystick does not overlap the permanent HUD
- joystick touch target is at least 40px by 40px

## Verification

Full release gate passed on 2026-07-01:

- syntax checks passed
- 18 Node system tests passed
- 13 mobile Playwright tests passed
- 11 desktop Playwright tests passed
- 2 desktop checks skipped as expected because they are mobile-only

Latest report: `docs/release-gates/latest.json`
