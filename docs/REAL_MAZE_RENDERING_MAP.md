# Real Maze Rendering Map

Scope: audit only. No visual, gameplay, CSS, or asset changes were made.

## Real Maze Rendering Files

- `index.html`: declares the playable surface as `<canvas id="game-canvas" width="960" height="720">` inside `.stage`.
- `game.js`: the real renderer. `gameLoop()` calls `update()` then `render()`. `render()` draws to `canvas#game-canvas`.
- Active maze path in `game.js`: `render()` -> `drawBackdrop()` -> `drawReferenceMazeBoard()` -> `getMazeAutotileAtlas()` -> `drawAutotileMazeBoard()` -> `drawAutotileStaticMazeLayers()`.
- Active layer order: world base, behind decor, floor, floor detail, center identity landmark, lane ribbons, floor decor, path contact shadows, wall layer, wall rim light, wall decor, set pieces, static lighting, ambient particles.
- Active wall/floor functions: `drawAutotileFloorLayer()`, `drawAutotilePathContactShadows()`, `drawAutotileWallLayer()`, `drawAutotileWallMasses()`, `drawAutotileWallCell()`, `drawAutotileWallRimLightLayer()`.
- Player/enemy/question rendering: `drawPlayerCharacter()`, `drawEnemies()`, `drawEnemyCharacter()`, and DOM `#question-dialog` in `index.html` styled by loaded CSS.
- `maze-theme-system.js`: supplies world theme containers; `game.js` attaches runtime theme objects into it.
- `maze-decor-system.js`: generates deterministic scatter decor positions from `state.maze`; it affects small floor/wall/behind decor, not the core maze topology.

## Real Maze Data Files

- `game.js` is the real maze data source. There is no separate level JSON for the playable grid.
- Grid constants: `WIDTH = 960`, `HEIGHT = 720`, `TILE = 24`, `COLS = 40`, `ROWS = 30`.
- Wall/path representation: `state.maze[y][x] === 1` means wall; `0` means walkable path.
- Level metadata: `CONFIG.levels` in `game.js`. First playable level is `CONFIG.levels[0]`, "עולם הקרח", with `enemyVisualStyle: "ice"`.
- Maze layout builder: `createMaze(levelIndex)`. For level `0`, it calls the ice pattern path, including `addClassicLoopSkeleton()` and `addIceArena()`.
- Player spawn: `PLAYER_START`, used by `createPlayer()` during `enterLevel()`.
- Enemy spawns: `AMBUSH_CELLS`, `scatterCornerFor()`, `chooseEnemySpawnCell()`, `createEnemy()`, `spawnEnemy()`.
- Boss/goal center: `CENTER_CELL`; `startBossChallenge()` places the boss there near the end of a stage.
- There is no fixed static question gate tile in the current playable maze. Questions open from enemy/boss/reward collisions through `openQuestion()`.
- There is no active physical exit tile in the first playable maze. Stage progress is driven by `CONFIG.answersPerLevel = 25`, boss challenge, and `CONFIG.targetCorrect = 100`.

## Real Mobile Layout/Scaling Files

- `styles.css`: base `.game-shell`, `.stage`, and `#game-canvas` dimensions.
- `arcade-foundation.css`: loaded after `ui/mobile-overrides.css`; it strongly affects active gameplay full-screen stage/HUD/canvas layout.
- `ui/mobile-overrides.css`: the loaded mobile cascade. It inlines legacy mobile files and includes the phone portrait `html:not(.start-screen-open) .stage` and `#game-canvas` rules.
- `mobile-enhancements.js`: sets touch/control classes and `--visual-viewport-height`.
- `game.js`: `resizeCanvas()`, `updateViewportProfile()`, `MOBILE_RUNTIME`, `CAMERA`, and `applyCameraTransform()` control backing-store scale, projection/cropping, visual profile, and camera.
- Root files such as `mobile-final-layout.css`, `mobile-resolution-hotfix.css`, `mobile-phone-refinement.css`, and `mobile-enhancements.css` are legacy source copies unless loaded elsewhere; `index.html` currently loads `ui/mobile-overrides.css`.

## Exact First Playable Level Entry Point

- User path: load `index.html`, submit `#player-form` by clicking `#start-button`.
- JS entry: `els.playerForm.addEventListener("submit", startGame)` and `els.pregameStartButton?.addEventListener("click", startGame)` in `game.js`.
- `startGame()` validates nickname/settings, calls `setupGame()`, sets phase to `playing`, hides `#start-screen`, and focuses `.stage`.
- `setupGame()` resets session state and calls `enterLevel(0)`.
- `enterLevel(0)` builds `state.maze = createMaze(0)`, computes reachability, creates player/enemies, seeds collectibles/decor/backdrop, then `render()` draws the first playable ice maze.
- Local verification shortcut: `/?verify=1&verifyLevel=0` triggers `window.__mathMazeRuntime.forceLevelForVerification(0)` and shows level 0 without using the menu.

## Current Maze Graphics Type

- Core maze walls/floors are canvas-drawn procedural shapes, gradients, generated atlas tiles, rounded rectangles, edge/corner overlays, shadows, and scatter decor.
- The active maze is not a DOM grid, not CSS rectangles, and not SVG.
- Wall/floor image tiles are effectively not active: `getMazeAutotileAtlas()` uses `const sheet = null`, and `MAZE_OPTIONAL_TILESETS` are set to `mode: "procedural"`.
- PNG image assets are active for player/enemy sprites and some collectible sprites. UI icons are SVG, but they are not maze walls/floors.

## Files To Change For A Visible Maze Improvement

- Primary: `game.js`, specifically the active `drawAutotile*` renderer functions listed above.
- Theme tuning: `game.js` theme constants and, if needed, `maze-theme-system.js` only where runtime themes are intentionally centralized.
- Decor tuning: `maze-decor-system.js` only for scatter placement/density/types.
- Mobile readability/cropping: `styles.css`, `arcade-foundation.css`, `ui/mobile-overrides.css`, `mobile-enhancements.js`, and `game.js` viewport/camera functions.
- Image-tile route: adding `assets/maze/{world}/tileset.png/json` alone is not enough; `MAZE_OPTIONAL_TILESETS` would also need to stop using `mode: "procedural"`.

## Do Not Waste Time Editing These Files

- `docs/*` specs/reports for visual impact; they do not change the playable maze.
- `main-menu.css`, `poster-loader.js`, `assets/math-maze-poster.png`, `assets/poster-*`: menu/poster/home screen only.
- `maze-enhancements.js`: currently a no-op marker; it does not render the maze.
- Root legacy mobile CSS files when `index.html` is loading `ui/mobile-overrides.css`.
- `mobile-camera-fit-runtime.js`: not loaded by `index.html`.
- `ui/icons.svg`, `leaderboard.css`, `ui/secondary-screens.css`, `ui/motion/*`: UI/overlays, not maze wall/floor rendering.
- `docs/references/maze/*` and `assets/reference/maze-worlds/*` for wall/floor changes while the active atlas keeps `sheet = null`.

## Exact Commands To Run

- Install only if dependencies are missing: `npm ci`
- Syntax/build check: `npm run build`
- Smoke tests: `npm run test:smoke`
- Full tests: `npm test`
- Manual local server: `python3 -m http.server 4173 --bind 127.0.0.1`
- Normal first level: open `http://127.0.0.1:4173/`, then click `#start-button`.
- Direct first playable maze: open `http://127.0.0.1:4173/?verify=1&verifyLevel=0`.
- Inspect both desktop and mobile portrait: use a desktop viewport such as `1280x720` and a mobile viewport such as `390x844` or `430x932`.

## Recommended First Visual Slice Target

Improve only the first playable ice maze wall/floor separation and wall depth in `game.js` inside `drawAutotileFloorLayer()`, `drawAutotilePathContactShadows()`, `drawAutotileWallMasses()`, and `drawAutotileWallCell()`. Do not change `createMaze()`, movement, questions, enemies, player identity, or menu art for the first slice.
