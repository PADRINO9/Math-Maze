# Android Device Testing

Use this checklist to test the current Kaflul debug APK on a real Android
phone before preparing a signed Google Play build.

## APK

`android/app/build/outputs/apk/debug/app-debug.apk`

This is a debug build for testing. It is not the final Google Play artifact.
Google Play will require a signed release AAB later.

## Free Local Install Path

1. Enable Developer options on the Android phone.
2. Enable USB debugging.
3. Connect the phone to this Mac with USB.
4. Approve the USB debugging prompt on the phone.
5. From the project root, run:

```bash
/Users/eliran/math-pacman/.android-sdk/platform-tools/adb devices
/Users/eliran/math-pacman/.android-sdk/platform-tools/adb install -r /Users/eliran/math-pacman/android/app/build/outputs/apk/debug/app-debug.apk
```

## Test Checklist

- App installs without warning loops.
- App opens from the Android launcher.
- Home screen has no clipped or overlapping controls.
- Character selection works.
- "שחק עכשיו" starts gameplay.
- Maze, player, enemies, HUD, and joystick are visible.
- Joystick moves the player.
- A math question opens and can be answered with touch.
- Pause/resume works.
- Back button behavior does not trap the player.
- Sound and mute button work.
- Reopen the app after closing it.

## Current Known Status

Passed on Android emulator on 2026-07-01:

- install
- launch
- home render
- gameplay render
- joystick movement
- empty crash buffer
- no unexpected dangerous permissions

Pending:

- real Android phone test
- signed release AAB
- Google Play policy documents
