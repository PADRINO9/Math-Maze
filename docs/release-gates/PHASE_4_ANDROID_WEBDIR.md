# Phase 4 Android WebDir Foundation

Date: 2026-07-01

This step prepares the web game to be wrapped as an Android app with Capacitor.
It does not require paid services and does not install any Android toolchain.

## Changes

- Added `capacitor.config.json` with the Android package id
  `com.kaflul.mathmaze`.
- Added `tools/android_webdir_gate.mjs` to build `dist/android-www` from the
  static game files.
- Added `tools/android_webdir_smoke.mjs` to serve `dist/android-www` and verify
  the copied Android bundle in a mobile Playwright viewport.
- Added the Android webDir gate to `tools/release_gate.mjs`.
- Added `dist/` to `.gitignore` because the Android webDir is generated.

## Gate Coverage

The Android webDir gate verifies:

- all expected root game files exist
- `assets/` and `ui/` are copied into the Android bundle
- `src`, `href`, and CSS `url(...)` references point to files inside the bundle
- the static bundle loads the manifest
- the copied bundle can start gameplay on a mobile viewport
- the copied bundle paints the canvas
- the joystick is visible during gameplay
- the joystick is hidden during the question dialog
- there are no browser console errors or bundled 404 responses in the smoke run

## Verification

Passed on 2026-07-01:

- `tools/android_webdir_gate.mjs`
- `tools/android_webdir_smoke.mjs`

Generated bundle: `dist/android-www`

Next Android gate completed: `docs/release-gates/PHASE_4_ANDROID_DEBUG_APK.md`
