# Kaflul Leaderboard Status

## Current Mode

Kaflul currently supports the local leaderboard as the production-safe default. Scores are saved in the existing local save data on the player's device and continue to appear in the leaderboard dialog.

The public leaderboard endpoint is present at `/api/champions`, but public publishing is available only when the existing backend configuration is complete.

## Backend Modes

### Configured Public Backend

The API is considered configured when the deployment provides:

- `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

When these values are present and Supabase responds successfully, `/api/champions` returns a JSON object with a `scores` array. The client then enables the public publish panel for eligible results.

### Unconfigured Public Backend

When the environment values are missing, `/api/champions` returns:

```json
{
  "code": "leaderboard_not_configured",
  "message": "טבלת השיאים עדיין לא הוגדרה."
}
```

with HTTP status `503`.

In this mode, the UI behaves as local-only:

- the leaderboard dialog says the public leaderboard is not active
- the public scope chip says `ציבורי לא פעיל`
- the result publish panel is hidden for ineligible results
- eligible results show disabled, honest copy:

```text
טבלת השיאים הציבורית עדיין לא פעילה. השיא נשמר במכשיר הזה.
```

- no public `POST /api/champions` request is sent unless the session capability check has already confirmed that the public backend is available

### Local-Only Fallback

If the capability check fails, times out, or returns an unavailable response, the session is cached as local-only. The game keeps working, local save behavior stays unchanged, and the player is not asked to publish to a broken public endpoint.

## Client Capability Check

The client performs a lightweight `GET /api/champions?capability=1` check only when a result is eligible for public publishing. The check caches the result for the browser session:

- success with `{ "publicAvailable": true }` enables public publishing
- unavailable responses keep the UI local-only
- the check does not block the home screen, leaderboard dialog, or gameplay
- failed checks are handled silently without console errors
- the capability route returns HTTP `200` even when the public backend is unconfigured, so unsupported public publishing does not create browser resource errors

## How To Enable Public Leaderboard Later

1. Provision the existing Supabase-backed schema expected by `api/champions.js`.
2. Provide the existing environment variables in Vercel Preview first:
   - `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Verify `GET /api/champions` returns HTTP `200` and a JSON object with `scores`.
4. Verify an eligible result enables the public publish panel.
5. Verify `POST /api/champions` accepts a valid score and rejects invalid submissions.
6. Repeat the same checks in Production only after Preview passes.

No new paid service, new backend, or new environment variable is required by the current implementation.

## Verification Coverage

- `tests/kaflul-systems.test.js` covers the local-only UI state and unconfigured API response.
- `tests/game.spec.js` covers a local leaderboard entry rendering while `/api/champions` returns `503`.
- The smoke test asserts that no automatic public `POST` is sent when the public backend is unavailable.

## Verification Screenshots

Local verification screenshots captured during Phase 8.4:

- `docs/leaderboard-status-screenshots/phase8-4-local-only-430x932.png`
- `docs/leaderboard-status-screenshots/phase8-4-local-only-1280x720.png`

These screenshots verify the honest local-only copy. A Vercel Preview screenshot should be captured after the branch preview is rebuilt from this commit.
