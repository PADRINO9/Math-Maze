# כפלול / Math Maze — Codex Working Rules

## Product Identity

This repository is `PADRINO9/Math-Maze`, the Hebrew mobile-first multiplication maze game "כפלול".

This is a Hebrew mobile-first educational maze game for practicing multiplication. The game must feel like a real polished mobile game, not a prototype grid. The maze visuals are part of the learning system, not decoration.

## Hard Rules

- Do not make documentation-only changes when the user asks for visual/gameplay improvement.
- Do not claim a visual improvement unless the actual playable game screen changed.
- Do not replace the game identity, player characters, ghosts, Hebrew RTL UI, or core multiplication logic.
- Do not break Start Game, player movement, enemy movement, multiplication questions, answer validation, victory flow, or mobile portrait layout.
- Do not push, deploy, or merge unless explicitly instructed.
- Do not hide uncertainty. If a visual change could not be verified, say so.

## Maze Visual Quality Bar

A successful maze graphics task must visibly improve:

- wall/floor separation
- wall depth
- floor polish
- question gate visibility
- exit/goal cue
- landmarks/orientation
- mobile readability
- visual hierarchy

## Done Means

A maze graphics task is not done until:

1. The relevant real game screen was changed, not just docs.
2. The changed files are listed.
3. The app builds or runs.
4. At least one desktop viewport and one mobile portrait viewport were checked.
5. Before/after screenshots are created, or the agent clearly explains why screenshots could not be created.
6. The final report says whether the new screenshot is unmistakably different from the old one.
7. If the result still resembles the old flat grid, the task must be marked as failed, not successful.

## Verification Commands

Before finishing any visual/gameplay task, run the project's available validation commands. Inspect `package.json` and existing scripts to determine the correct commands.

Prefer:

- `npm install` / `npm ci` only if needed
- `npm run build` if available
- `npm run lint` if available
- `npm test` if available
- any existing validate/runtime script if available

## Visual Proof Requirement

For UI or maze changes, use the available browser/screenshot workflow if possible.

Capture:

- first playable maze on desktop
- first playable maze on mobile portrait around 390x844 or 430x932
- any changed question gate / answer state if possible

## Reporting Format

Every final response for visual/gameplay work must include:

- Summary of visible changes
- Files changed
- How to test
- Screenshots or screenshot paths if available
- Tests/build results
- Known risks
- Whether the visible result is significantly different from before

Keep this file concise and practical.
