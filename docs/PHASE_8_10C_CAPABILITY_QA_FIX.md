# Phase 8.10C Capability QA Fix

## Root Cause

`node --run test:final` uses `tools/phase7_final_qa_verification.mjs`, which starts a local static HTTP server for the final QA browser run.

The production branch includes `api/champions.js`, where `GET /api/champions?capability=1` returns HTTP `200` with a local-only capability payload when the public leaderboard backend is unconfigured.

The local final-QA static server did not model that API route. During the accelerated victory probe, the client correctly requested `/api/champions?capability=1`, but the static server treated it as a missing file and returned `404`. Chrome logged `Failed to load resource`, causing the release gate to fail.

## Fix

The final-QA local server now handles only `/api/champions`:

- `GET /api/champions?capability=1` returns HTTP `200` with `{ "publicAvailable": false, "code": "leaderboard_not_configured" }`.
- Other `/api/champions` requests return HTTP `503` with the unconfigured leaderboard payload, matching the safe local-only backend mode.
- Other missing files still return `404`; unrelated network errors are not suppressed.

The final-QA report records leaderboard API requests and fails if a public `POST /api/champions` occurs while local-only capability is unavailable.

## Verification Added

- Browser smoke coverage now verifies the local-only capability response is HTTP `200`.
- The smoke test asserts no automatic public `POST` occurs.
- The final QA harness asserts no public POST occurs in the accelerated victory/result path.

## Product Behavior

No gameplay, scoring, save schema, local leaderboard, or public leaderboard backend behavior changed.

Public leaderboard remains unavailable unless the existing backend environment variables are configured. The release behavior remains safe local-only mode.

