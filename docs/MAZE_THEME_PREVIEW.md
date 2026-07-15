# Maze Theme Preview Mode

Developer-only preview for checking the playable maze art across all four worlds without playing through progression.

## Open

Run the local dev server and open:

```text
http://127.0.0.1:5173/?debugMazeThemes=true
```

If the server uses a different Vite port, keep the same query string:

```text
?debugMazeThemes=true
```

The preview is enabled only on `127.0.0.1` or `localhost`.

## Controls

- Use the floating preview buttons: `Ice`, `Lava`, `Ancient`, `Diamond`.
- Keyboard shortcuts also work in preview mode: `1`, `2`, `3`, `4`.
- Optional direct links:
  - `?debugMazeThemes=ice`
  - `?debugMazeThemes=lava`
  - `?debugMazeThemes=ancient`
  - `?debugMazeThemes=diamond`

## Scope

This mode uses the existing maze renderer and forces the active level for visual inspection. It does not change math logic, movement, collision, scoring, enemy rules, or character rendering.

## Remove Later

The preview code is isolated in `game.js` around:

- `MAZE_THEME_PREVIEW_WORLDS`
- `isMazeThemePreviewRun`
- `installMazeThemePreviewMode`

Removing those helpers and the call to `installMazeThemePreviewMode(runtime)` removes the feature.
