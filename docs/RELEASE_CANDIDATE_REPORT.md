# UI Next Level Release Candidate Report

Date: 2026-06-29
Branch: `codex/ui-next-level-release`
Recommendation: **not ready for merge**

## Executive recommendation

This release candidate should **not** be merged yet.

The local branch contains the latest stabilization work, but the GitHub PR and Vercel Preview still point to an older remote branch commit. The current release candidate HEAD has not been pushed to the PR, and the existing Preview URL is protected by Vercel Authentication, so it cannot be used as an automation-accessible release gate.

Once the branch is pushed and a fresh Preview for the current HEAD is available, the candidate should be rechecked. Based on local verification, the implementation is close, but it should be considered **ready only if the public leaderboard remains local-only until backend configuration is intentionally completed**.

## Branch, PR, and deployment state

| Item | Result | Notes |
| --- | --- | --- |
| Current branch | PASS | `codex/ui-next-level-release` |
| Local branch commit | PASS | `583dbc847d3a63ea09a677f94c14e58cbad3525e` |
| Remote branch commit | FAIL | `origin/codex/ui-next-level-release` is still `ef06fcecb6ef338418aa5bc22fb5a7147d7d963f`; local branch is ahead by 7 commits. |
| Main commit | PASS | `origin/main` is `1b03fe729b822519467eaef50e57354b99bbf69e`. |
| PR URL | PASS | https://github.com/PADRINO9/Math-Maze/pull/14 |
| PR status | PASS | Open draft PR, base `main`, head `codex/ui-next-level-release`. |
| PR head matches local HEAD | FAIL | PR head is `ef06fce`, not local `583dbc8`. |
| Existing Vercel Preview | BLOCKED | `https://mathmaze-git-codex-ui-next-af6675-eliranfcb-gmailcoms-projects.vercel.app/` returns 302 to Vercel SSO for unauthenticated checks. |
| Production unchanged | PASS | `https://math-maze-il.vercel.app/` returns production HTML without `ui/*` assets, matching the known `main` state. |
| Production deployment triggered by this task | PASS | No merge, production deploy, or push was performed. |

## Pass/fail gate table

| Gate | Status | Evidence |
| --- | --- | --- |
| Working tree contains only intended changes | FAIL | The branch began this gate with untracked `docs/PREVIEW_QA_REPORT.md` and `docs/preview-qa-screenshots/`. Final QA refreshed Phase 7 screenshot evidence and JSON. |
| All tests pass | PARTIAL | Core build, Node tests, smoke tests, and full `node --run test` pass. Final QA has one static-server console 404 described below. |
| Production build passes | PASS | `node --run build` passed. Standard `npm run build` could not run in this Codex shell because `npm` is not installed in PATH. |
| No console errors in verified flows | FAIL | Final QA victory probe logs a resource 404 for `/api/champions?capability=1` when run through a local static server. |
| Required screenshots exist | PASS | Phase 7 screenshots exist for all required viewports plus gameplay/question/results evidence. |
| `docs/UI_QA_REPORT.md` current | PASS | Existing Phase 7 QA report remains present; this RC report records the newer gate result. |
| No unresolved critical issue | FAIL | Current HEAD is not pushed to PR/Preview, and Preview is not automation-accessible. |
| No undocumented gameplay rule change | PASS | No gameplay rule edits were made in this gate; system tests for scoring, combo, missions, persistence, and state transitions pass. |
| No save-schema regression | PASS | Persistence tests pass. |
| No final production icon uses emoji/Unicode | PASS | Node icon-system test passes; mathematical `×` remains allowed. |
| Mobile portrait works | PASS local | 390x844 and 430x932 Phase 7 viewport probes passed layout checks. |
| Mobile landscape works | PASS local | 844x390 Phase 7 viewport probe passed layout checks. |
| Desktop works | PASS local | 1280x720 and 1440x900 Phase 7 viewport probes passed layout checks. |
| RTL works | PASS local | Phase 7 probes report `lang=he` and `dir=rtl`. |
| Nickname, character, mode, difficulty, sound persistence | PASS | Smoke test `menu selections, nickname and sound state persist across reloads` passed. |
| Preview loads current branch assets | FAIL | Existing Preview cannot prove current HEAD because remote PR head is stale and the URL redirects to Vercel SSO. |
| Public leaderboard UX is not broken | PASS local / BLOCKED preview | Local tests confirm local-only behavior; Preview cannot be verified. Production still returns 503 because production is still on `main`. |

## Local verification results

Standard npm commands were attempted first because they are the clean-clone commands documented in `docs/TEST_SETUP.md`.

| Command | Result | Notes |
| --- | --- | --- |
| `npm ci` | FAIL in Codex shell | `zsh:1: command not found: npm`. This is an environment issue in the current Codex shell, not a repository script failure. |
| `npm run build` | FAIL in Codex shell | Same missing `npm` binary. |
| `npm run test:node` | FAIL in Codex shell | Same missing `npm` binary. |
| `npm run test:smoke` | FAIL in Codex shell | Same missing `npm` binary. |
| `npm test` | FAIL in Codex shell | Same missing `npm` binary. |
| `node --run build` | PASS | Syntax/build checks passed. |
| `node --run test:node` | PASS | 18 passed, 0 failed. |
| `node --run test:smoke` | PASS | 21 passed, 1 skipped. |
| `node --run test` | PASS | Node tests passed, then Playwright smoke passed with 21 passed and 1 skipped. |
| `node --run test:final` | FAIL | Final QA captured all screenshots but reported `victory: console/runtime errors`. |

The `test:final` failure was reproduced and identified as a local static-server mismatch:

- Request: `GET /api/champions?capability=1`
- Local static server result: `404`
- Console message: `Failed to load resource: the server responded with a status of 404 (Not Found)`
- Victory UI result: visible, title `אלוף כפלול ניצח!`

The branch API route itself contains a capability response path that returns HTTP 200 when the public leaderboard backend is unconfigured. Node tests verify that behavior. A current, accessible Vercel Preview is still required to prove the deployed API route and UI together.

## Preview and production verification

| URL | Status | Result |
| --- | --- | --- |
| `https://mathmaze-git-codex-ui-next-af6675-eliranfcb-gmailcoms-projects.vercel.app/` | 302 | Redirects to Vercel SSO. Could not inspect HTML, assets, console, or flows unauthenticated. |
| `https://mathmaze-git-codex-ui-next-af6675-eliranfcb-gmailcoms-projects.vercel.app/api/champions?capability=1` | 302 | Redirects to Vercel SSO. |
| `https://math-maze-il.vercel.app/` | 200 | Production remains on main; `ui/foundation.css`, `ui/icons.svg`, `ui/assets/asset-manifest.js`, `ui/character-animation-adapter.js`, `ui/motion/*`, and `ui/sounds/*` are missing from production HTML as expected. |
| `https://math-maze-il.vercel.app/api/champions` | 503 | Production main still reports `leaderboard_not_configured`. |
| `https://math-maze-il.vercel.app/api/champions?capability=1` | 503 | Production main does not include the branch-side capability behavior yet. |

No production deployment was triggered by this gate.

## Critical flow coverage

| Flow | Status | Evidence |
| --- | --- | --- |
| First load | PASS local | Phase 7 viewport probes. |
| Returning player load | PASS local | Phase 7 returning-player checks. |
| Nickname persistence | PASS local | Smoke persistence test. |
| Bifly selection | PASS local | Hero gallery smoke tests. |
| Nabatick selection | PASS local | Hero gallery smoke tests. |
| Mode selection | PASS local | Smoke and Phase 7 checks. |
| Difficulty selection | PASS local | Smoke and Phase 7 checks. |
| Locked Legendary | PASS local | Phase 7 locked difficulty check. |
| Start game | PASS local | Smoke start-game test. |
| Pause/resume | PASS local | Final QA functional checks. |
| Question dialog | PASS local | Final QA functional checks and screenshot. |
| Correct answer | PASS local | Final QA functional checks. |
| Wrong answer | PASS local | Final QA functional checks. |
| Timeout | PASS local | Final QA functional checks. |
| Result screen | PASS with note | Game over and victory screens were visible; victory path had the static-server `/api/champions?capability=1` 404. |
| Local leaderboard | PASS local | Smoke local-only leaderboard test. |
| Return to home | PASS local | Final QA functional checks. |

## UI quality coverage

| Area | Status | Notes |
| --- | --- | --- |
| Emoji/Unicode UI icons removed | PASS local | Static Node test passes. |
| HUD simplified | PASS local | HUD test confirms only approved permanent metrics. |
| Hero gallery works | PASS local | Phase 8.8 smoke tests pass. |
| Bottom navigation works | PASS local | Phase 8.8 smoke tests pass. |
| Sheets do not clip | PASS local | Phase 7 viewport probes report no out-of-bounds or overflowing text. |
| Mobile accidental scroll | PASS local | Phase 7 probes report no document overflow. |
| RTL | PASS local | Phase 7 probes report Hebrew RTL document state. |
| Focus visible / dialog behavior | PASS local | Phase 7 and smoke checks cover panel open/close and focus behavior. |

## Screenshot evidence

Current Phase 7 RC evidence:

- `docs/phase7-screenshots/phase7-before-home-390x844-portrait.png`
- `docs/phase7-screenshots/phase7-after-pregame-390x844-portrait.png`
- `docs/phase7-screenshots/phase7-before-home-430x932-portrait.png`
- `docs/phase7-screenshots/phase7-after-pregame-430x932-portrait.png`
- `docs/phase7-screenshots/phase7-before-home-844x390-landscape.png`
- `docs/phase7-screenshots/phase7-after-pregame-844x390-landscape.png`
- `docs/phase7-screenshots/phase7-before-home-1280x720-desktop.png`
- `docs/phase7-screenshots/phase7-after-pregame-1280x720-desktop.png`
- `docs/phase7-screenshots/phase7-before-home-1440x900-desktop.png`
- `docs/phase7-screenshots/phase7-after-pregame-1440x900-desktop.png`
- `docs/phase7-screenshots/phase7-gameplay-430x932-portrait.png`
- `docs/phase7-screenshots/phase7-question-430x932-portrait.png`
- `docs/phase7-screenshots/phase7-gameover-430x932-portrait.png`
- `docs/phase7-screenshots/phase7-victory-430x932-portrait.png`
- `docs/phase7-screenshots/phase7-asset-fallback-390x844-portrait.png`
- `docs/phase7-screenshots/phase7-final-qa-report.json`

Additional phase evidence remains available under:

- `docs/phase2-screenshots/`
- `docs/phase3-screenshots/`
- `docs/phase4-screenshots/`
- `docs/phase5-screenshots/`
- `docs/phase6-screenshots/`
- `docs/leaderboard-status-screenshots/`

## Blockers

1. **Local HEAD is not pushed.** The local release candidate is `583dbc8`, but the PR and remote branch are still `ef06fce`.
2. **Preview is stale and protected.** The existing Preview URL redirects to Vercel SSO and cannot verify current branch assets, console state, UI flows, or `/api/champions`.
3. **Final QA is not fully green locally.** The accelerated victory probe logs a 404 for `/api/champions?capability=1` when run through a local static server. This should be revalidated on an updated Vercel Preview where the API route exists.
4. **Public leaderboard remains unconfigured in production.** This is acceptable only if the UI remains local-only until backend configuration is intentionally completed and verified.

## Non-blocking known issues and risks

- CSS hotfix debt has been reduced but not eliminated.
- Some image resources are still loaded twice in performance entries, especially character assets.
- Total approved UI/game art payload measured by Final QA is about 4.88 MB.
- Real branded audio files are still missing; UI audio uses generated WebAudio tones.
- Character animation assets are incomplete; unsupported states use static fallback.
- The public leaderboard backend still requires intentional configuration before public publishing can be enabled.

## Commands run

- `git branch --show-current`
- `git status --short --branch`
- `git log --oneline -10 --decorate`
- `git rev-parse HEAD origin/codex/ui-next-level-release origin/main`
- `gh pr view 14 --repo PADRINO9/Math-Maze --json url,state,isDraft,baseRefName,headRefName,headRefOid,mergeStateStatus,reviewDecision,statusCheckRollup,commits`
- `npm ci`
- `npm run build`
- `npm run test:node`
- `npm run test:smoke`
- `npm test`
- `node --run build`
- `node --run test:node`
- `node --run test:smoke`
- `node --run test`
- `node --run test:final`
- Network fetch checks for production, preview, and `/api/champions`
- Local Playwright reproduction for the victory-path `/api/champions?capability=1` 404

## Final decision

**Not ready for merge.**

Smallest safe next action:

1. Push `codex/ui-next-level-release` without force so PR #14 points to local HEAD `583dbc8`.
2. Wait for a fresh Vercel Preview deployment for that commit.
3. Ensure the Preview is accessible to automated QA or provide a safe automation bypass.
4. Re-run this release candidate gate against the fresh Preview.
5. Keep public leaderboard UI local-only unless the backend is configured and verified.
