# Phase 4 Android Debug APK

Date: 2026-07-01

This gate proves that Kaflul can be packaged and launched as a native Android
debug APK without paid services.

## Build Output

- APK: `android/app/build/outputs/apk/debug/app-debug.apk`
- Size: 20 MB
- Package id: `com.kaflul.mathmaze`
- App name: `כפלול`
- Version name: `1.0`
- Version code: `1`
- minSdk: 24
- targetSdk: 36

## Native App Decisions

- Android wrapper: Capacitor
- Orientation: portrait
- Launch mode: single task
- Backup: disabled for the debug app
- Runtime networking permission: not requested
- Visual shell: immersive fullscreen with dark safe-area background
- Android icons and splash screens generated from local project assets

## Permissions

Verified with `aapt2 dump permissions`:

- `com.kaflul.mathmaze.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`

No `INTERNET`, location, camera, microphone, contacts, storage, ads, analytics,
or tracking permissions are requested by this APK.

## Emulator QA

Device:

- AVD: `kaflul_pixel`
- Android API: 36
- Form factor: Pixel 5 style portrait emulator

Manual Android checks passed:

- Installed APK with `adb install -r`
- Launched `com.kaflul.mathmaze/.MainActivity`
- Launch result: `Status: ok`
- App process stayed alive after launch
- Android crash buffer stayed empty after launch
- Home screen rendered in the APK
- Gameplay opened from the home screen
- Joystick swipe moved the player in the arena
- Android crash buffer stayed empty after gameplay input

Screenshots captured:

- `/private/tmp/kaflul-android-home-fullscreen-fixed.png`
- `/private/tmp/kaflul-android-gameplay-attempt1.png`
- `/private/tmp/kaflul-android-gameplay-joystick.png`

## Release Gates

Passed on 2026-07-01:

- `npm run test:release-gate`
- `./gradlew assembleDebug`

Full release gate coverage:

- 18 Node system tests passed
- Android webDir gate passed
- Android smoke test passed
- 13 mobile Playwright tests passed
- 11 desktop Playwright tests passed
- 2 desktop-only tests skipped as expected

Report: `docs/release-gates/latest.json`

## Remaining Before Google Play

- Test the debug APK on a real Android phone.
- Build a signed release AAB.
- Create Play Store screenshots from an Android build.
- Write privacy policy and data safety answers.
- Complete Google Play account setup when approved, which is the first likely
  paid step.
