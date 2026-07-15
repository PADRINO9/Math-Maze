# Phase 1 Android App Shell

Date: 2026-07-01

This step added the first Android/PWA app-shell metadata needed for the mobile
release path.

## Added

- `app.webmanifest`
- manifest link in `index.html`
- Apple touch icon link in `index.html`
- application name metadata
- Phase 1 Playwright checks for installable app-shell metadata

## Why

The Android release path will later use Capacitor and Google Play packaging, but
the web game still needs a clear mobile app identity: app name, theme colors,
portrait orientation, fullscreen display mode, and app icons.

## Gate

The Phase 1 vertical-slice test now verifies:

- manifest is linked
- manifest can be fetched
- app name exists
- portrait orientation is declared
- fullscreen display mode is declared
- 512x512 maskable icon exists

The next phase can replace the icon with a dedicated store icon, but this gives
the app a stable no-cost shell now.
