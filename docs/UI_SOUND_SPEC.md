# Kaflul UI Sound Spec

Date: 2026-07-12
Phase: production game audio

## Scope

This document defines the production audio behavior for the Kaflul interface and gameplay. UI, music, gameplay, character, enemy, and boss audio now share one WebAudio mixer.

Production owners:

- Production audio engine: `ui/sounds/kaflul-audio-engine.js`
- UI compatibility adapter: `ui/sounds/ui-sound-controller.js`
- Original audio assets: `assets/audio/`
- Integration points: `game.js`
- Manifest metadata: `ui/assets/asset-manifest.js`
- Verification: `tools/phase6_motion_audio_verification.mjs`

## Principles

- Respect the existing mute setting.
- Respect browser autoplay restrictions.
- Do not create an `AudioContext` until a user gesture or explicit gesture-tagged call.
- Avoid copyrighted, unlicensed, harsh, or repetitive sounds.
- Keep UI sounds separate from gameplay tones.
- Fail gracefully when WebAudio is unavailable.
- Keep sounds short and soft enough for repeated menu navigation.

## Current Source Status

Kaflul now ships 107 original WAV assets generated from the reproducible source in `tools/generate_audio_assets.py`. The pack contains adaptive music stems for all four worlds, boss layers, UI/gameplay feedback, character voices, enemy voices, and five cues for every boss. No stock or externally licensed recordings are used.

## Event Map

| Event | Current implementation | Purpose |
| --- | --- | --- |
| `buttonPress` | Short triangle tick | Generic control press. |
| `primary-play` | Two-note generated rise | Main `שחק עכשיו` action. Temporary generated UI tone, not final branded audio. |
| `panelOpen` | Two-note soft rise | Modal or sheet opens. |
| `panelClose` | Short low sine | Modal or sheet closes. |
| `tabChange` | Short triangle tick | Bottom nav, filters, and tab-like option changes. |
| `characterSelected` | Two-note bright response | Character selection confirmation. |
| `modeSelected` | Short mid triangle | Arcade/Adventure selection. |
| `difficultySelected` | Two-note mid response | Difficulty selection. |
| `lockedAction` | Low deny pair | Locked or unavailable action. |
| `notification` | Short high sine | Save, refresh, or lightweight confirmation. |
| `reward` | Three-note reward rise | Reward or positive result. |
| `newRecord` | Three-note brighter rise | New record feedback. |

## Mute Contract

- Existing `state.soundEnabled` remains the source of truth.
- `updateSoundButton` synchronizes `window.KaflulUiSound.setEnabled`.
- Muted calls return `{ ok: false, reason: "muted" }`.
- Muted calls must not create new audible output.
- Toggling sound back on may play a quiet notification only from the user gesture that enabled sound.

## Phase 8.9 Stabilization Notes

The production engine keeps the Phase 8.9 event contract while replacing its oscillator tones with original decoded audio buffers. The `data-ui-sound="primary-play"` hook maps to the branded start cue.

Verified UI sound events:

- `buttonPress`
- `primary-play`
- `panelOpen`
- `panelClose`
- `tabChange`
- `characterSelected`
- `modeSelected`
- `difficultySelected`
- `lockedAction`
- `reward`
- `newRecord`

These events now resolve through the production Kaflul asset pack.

## Autoplay Contract

- Before a user gesture, `KaflulUiSound.play("buttonPress")` must return `{ ok: false, reason: "not-unlocked" }`.
- Pointer and keyboard activation call `unlockFromGesture`.
- If the browser suspends the context, the controller attempts `resume()` and continues gracefully.
- If WebAudio is not available, the controller returns `{ ok: false, reason: "audio-context-unavailable" }`.

## Repetition And Throttling

- Generic button press defaults to a short 55ms throttle window.
- Other UI events default to a 90ms throttle window.
- Throttled calls return `{ ok: false, reason: "throttled" }`.
- Repeated tab, filter, or sheet interaction should remain quiet and non-fatiguing.

## Gameplay Separation

The UI controller owns menu, sheet, modal, selection, reward, and record sounds. Existing gameplay tone helpers still own:

- correct answer
- wrong answer
- gameplay item pickup
- mission/gameplay feedback already tied to game timing
- fireworks/result gameplay celebration until final audio assets exist

Future audio replacement must keep this separation unless a later approved phase intentionally unifies the whole audio engine.

## Production Audio Assets

The current pack includes:

- button press
- primary play
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
- gameplay correct answer
- gameplay wrong answer
- combo milestone
- mission complete
- life lost
- world transition

Requirements for future files:

- Original or properly licensed.
- Short, soft, and non-harsh.
- Exported as web-friendly compressed audio plus source masters.
- Clear naming that maps to the event table above.
- Loudness-normalized across UI sounds.
- Gameplay tones kept distinct from UI tones.

## Verification Requirements

Phase 6 verification must confirm:

- `window.KaflulUiSound` is available.
- Pre-gesture autoplay is blocked.
- Mute is respected.
- Re-enabling sound can unlock and play only through a gesture.
- UI interactions do not create console/runtime errors.
- The app remains functional when the controller returns blocked, muted, unavailable, or throttled results.
