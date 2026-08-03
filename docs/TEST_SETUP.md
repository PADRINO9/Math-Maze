# Kaflul Test Setup

This repository uses npm for deterministic dependency installation. The npm lockfile is
`package-lock.json`.

## Clean Clone Setup

From a clean clone, run:

```sh
npm ci
npx playwright install chromium
npm run build
npm run test:node
npm run test:smoke
npm test
```

`npm ci` installs exactly the dependency versions recorded in `package-lock.json`.
The Playwright browser install places browser binaries in the local Playwright cache,
not in this repository.

## Requirements

- Node.js with npm available on `PATH`
- Python 3 available as `python3`
- Chromium browser binaries installed by Playwright

`playwright.config.js` starts a local static server with:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

## Scripts

- `npm run build` checks the production JavaScript files for syntax errors.
- `npm run test:node` runs the deterministic Node systems tests.
- `npm run test:smoke` runs the Playwright smoke suite in Chromium.
- `npm test` runs the Node systems tests and then the full Playwright suite.

## If Playwright Browsers Are Missing

Install only the browser engine required by the current Playwright config:

```sh
npx playwright install chromium
```

Do not commit downloaded browser binaries, `node_modules/`, `test-results/`, or
`playwright-report/`.

## Codex Environment Note

During Phase 8.2 verification, the local Codex runtime had Node.js available but no
`npm` binary on `PATH`. To create and verify the npm lockfile in that environment,
the npm CLI was run through the bundled package runner:

```sh
PATH=/Users/eliran/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  /Users/eliran/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/pnpm dlx npm@11.6.2 ci
```

Contributors with a normal Node/npm installation should use the standard commands
above.
