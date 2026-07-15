# Maze Rendering Audit

Date: 2026-07-03
Scope: analysis only. No gameplay code, movement code, collision code, math logic, character art, or maze renderer code was changed in this phase.

## 1. Files That Currently Control Maze Rendering

- `game.js` is the main gameplay and canvas renderer. It owns the logical maze grid, world theme selection, canvas resize/camera behavior, maze drawing, collectibles, hazards, characters, enemies, boss rendering, particles, and HUD canvas overlays.
- `index.html` defines the gameplay surface: `.stage` and `canvas#game-canvas` with intrinsic size `960x720`.
- `styles.css` defines the base `.game-shell`, `.stage`, `#game-canvas`, and desktop/default HUD layout.
- `arcade-foundation.css` overrides the gameplay shell into a fixed full-viewport app surface and defines much of the in-game HUD/mobile visual shell.
- `ui/mobile-overrides.css` includes additional mobile layout rules and also contains copied legacy rules from `mobile-final-layout.css`.
- `mobile-final-layout.css` defines a phone portrait stage/HUD/joystick grid for active gameplay.
- `mobile-resolution-hotfix.css`, `mobile-enhancements.css`, `mobile-phone-refinement.css`, and `mobile-native-answer.css` also touch `.stage`, `#game-canvas`, or question-open/mobile layout behavior.
- `mobile-camera-fit-runtime.js` patches canvas `translate`/`scale` behavior for `#game-canvas`; it affects camera/canvas transform behavior and should be treated carefully.
- `maze-enhancements.js` is intentionally a no-op marker now. It does not render a second maze layer.
- `assets/reference/maze-worlds/world_ice.png`, `world_lava.png`, `world_ancient.png`, and `world_diamond.png` are the currently loaded maze reference sheets used by the runtime atlas/crop helpers.
- `docs/references/maze/world_ice.png`, `world_lava.png`, `world_ancient.png`, and `world_diamond.png` are documentation/reference copies of the same visual sources.

## 2. Function Map

### Grid, Maze Shape, and Collision Inputs

- `WIDTH`, `HEIGHT`, `TILE`, `COLS`, and `ROWS` in `game.js` define a fixed logical canvas of `960x720`, with `24px` tiles, `40` columns, and `30` rows.
- `createMaze(levelIndex)` builds the logical maze as a `ROWS x COLS` matrix where `1` means wall and `0` means walkable path.
- `addReferenceMazePattern`, `carveReferencePath`, and `clearZone` are older/extra maze-shaping helpers. The active `createMaze` currently does not call `addReferenceMazePattern`.
- `isWallCell(x, y)` and `isWalkableCell(x, y)` expose the logical grid to both collision and rendering.
- `circleHitsWall(x, y, radius)` is the gameplay collision check and must not be changed for a visual-only pass.
- `computeReachable(start)`, `seedCollectibles()`, and `isReferenceCollectibleLane(cell)` use the logical maze to decide reachable cells and collectible placement.

### Active Maze Rendering Path

- `render()` is the main draw frame. Its current order is:
  `drawBackdrop()` -> `drawReferenceMazeBoard()` -> fallback maze only if reference rendering fails -> hazards -> collectibles -> player -> enemies -> boss -> particles/text -> vignette -> HUD overlays.
- `drawReferenceMazeBoard()` is the active maze entry point. It builds/gets an atlas and calls `drawAutotileMazeBoard(level, atlas)`.
- `getMazeWorldKey(level)` reads `level.enemyVisualStyle`.
- `getMazeWorldSheet(level)` resolves the active reference sheet from `MAZE_WORLD_SHEETS` and `GAME_ASSETS.mazeWorlds`.
- `getMazeAutotileTheme(level)` resolves visual tokens from `MAZE_AUTOTILE_THEMES`.
- `getMazeAutotileAtlas(level)` creates a runtime tile atlas containing floor, wall, edges, corners, and decor tiles.
- `drawAtlasFloorTile`, `drawAtlasWallTile`, `drawAtlasEdgeTile`, `drawAtlasCornerTile`, and `drawAtlasDecorTile` paint each atlas role.
- `drawAtlasReferenceTexture()` samples reference-sheet crops into the atlas when a sheet is loaded.

### Active Autotile Layers

- `drawAutotileMazeBoard(level, atlas)` controls the active visual layer order:
  1. `drawAutotileWorldBase(theme)`
  2. `drawAutotileFloorLayer(atlas)`
  3. `drawAutotilePathContactShadows(theme)`
  4. `drawAutotileWallLayer(atlas)`
  5. `drawAutotileDecorationLayer(atlas)`
  6. `drawAutotileAmbientLayer(level, theme)`
- `drawAutotileFloorLayer(atlas)` draws walkable path runs from `state.maze`, then applies floor reference textures.
- `drawAutotilePathContactShadows(theme)` darkens walkable cells next to walls.
- `drawAutotileWallLayer(atlas)` draws wall shadows, wall masses, exposed edges, and corner overlays.
- `drawAutotileWallMasses(atlas)` draws continuous wall runs from `state.maze`, then applies wall reference textures.
- `drawAutotileWallCell(atlas, x, y)` decides which exposed edge/corner atlas overlays to place around a wall cell.
- `drawAutotileDecorationLayer(atlas)` places sparse world decor only on selected wall cells.
- `drawAutotileAmbientLayer(level, theme)` adds simple world particles and vignette.

### Older/Fallback Maze Renderers

These functions still exist in `game.js`, but the active `drawReferenceMazeBoard()` path bypasses them unless atlas creation fails:

- Layered fallback system: `drawMazeBaseFloorLayer`, `drawMazeWalkablePathLayer`, `drawMazeWalkableCell`, `drawMazePathMotifs`, `drawMazeContactShadowLayer`, `drawMazeRaisedWallLayer`, `drawMazeRaisedWallCell`, `drawMazeEdgeBevelLayer`, `drawMazeWorldDecorationLayer`, and `drawMazeAmbientEffectLayer`.
- Reference-tile fallback/experiment: `drawReferenceTileFloor`, `drawReferenceTileWalls`, `drawReferenceTileWallCell`, `drawReferenceTileDecor`, `drawReferenceFixedSetPieces`, and `drawReferenceTileLighting`.
- Older direct maze rendering: `drawCorridorBase`, `drawMazeFloor`, `drawMazeLaneDepth`, `drawMaze`, `drawMazeSetPieces`, `drawArenaLandmarks`, `drawWallEdgeHighlights`, and `drawWallMotif`.

### Collectibles, Hazards, Characters, Enemies, and UI

- `drawCollectibles()` draws all collectible objects. It uses `getMazeWorldSheet(level)` and `drawReferenceCollectibleSprite()` when possible.
- `drawMazeWorldCropCanvas()`, `getTransparentMazeWorldSprite()`, and `drawMazeWorldTextureRect()` are shared helpers for sampling reference-sheet crops.
- `drawEnvironmentHazards()` and `drawHazardCell()` draw active world hazards. Individual hazard visuals are in `drawLavaHazardCell`, `drawIceHazardCell`, `drawRuneHazardCell`, and `drawCrystalHazardCell`.
- `drawPlayerCharacter(ctx, state.player)` draws the selected hero. This is character rendering, not maze rendering.
- `drawEnemies()` and `drawEnemyCharacter()` draw ghosts. This is enemy rendering, not maze rendering.
- `drawBoss()` draws the boss. This is boss rendering, not maze rendering.
- `drawLevelBanner()` and DOM HUD elements from `index.html`/CSS form the visible UI around the canvas.

## 3. How The Active World/Theme Is Decided

- `state.levelIndex` is the source of the current stage.
- `getCurrentLevel()` returns `CONFIG.levels[state.levelIndex]`.
- Each entry in `CONFIG.levels` defines `enemyVisualStyle`, currently one of `ice`, `lava`, `ancient`, or `diamond`.
- `enemyVisualStyle` is reused as the visual world key by:
  - `getMazeWorldKey(level)`
  - `MAZE_AUTOTILE_THEMES`
  - `MAZE_WORLD_SHEETS`
  - `MAZE_MATERIALS`
  - `MAZE_WORLD_RENDER_THEMES`
- `enterLevel(levelIndex)` sets `state.levelIndex`, rebuilds `state.maze`, recomputes reachable cells, creates the player/enemies, seeds collectibles, and seeds backdrop data.
- `GAME_ASSETS.mazeWorlds` loads each reference sheet from `MAZE_WORLD_SHEETS[worldKey].src`.

## 4. Why The Current Maze Still Looks Prototype-Like

- The active renderer still draws the maze mostly as `24px` rectangular grid cells and long horizontal runs, so the material reads as blocks placed on a grid rather than as a rich environment.
- The reference sheets are sampled as texture crops, but the current renderer does not yet reconstruct the reference image language: chunky modular walls, bevel depth, unique corner shapes, props, readable lane borders, and staged lighting.
- Wall masses are drawn mainly as flat strips with overlays. They need stronger top/side separation and consistent edge language.
- The old fallback renderers, the newer autotile renderer, and multiple theme token objects coexist in the same file, which makes visual changes easy to apply in the wrong layer.
- Several CSS files affect gameplay canvas sizing. That makes mobile visual judgment harder because a maze change may look wrong due to canvas cropping/layout rather than the renderer itself.
- Decorations are sparse and procedural, but not yet organized by safe gameplay zones versus visual-only borders.

## 5. What Is Safe To Refactor

- Move maze visual configuration into a dedicated world-theme structure keyed by `ice`, `lava`, `ancient`, and `diamond`.
- Keep the logical `state.maze` unchanged, but replace only how wall/path cells are drawn.
- Consolidate the active maze renderer behind one clear entry point, for example `drawMazeWorldBoard(level)`.
- Keep atlas/crop helpers, but separate them from gameplay logic and make their roles explicit: floor, wall top, wall side, edge, corner, decor, collectible.
- Refactor `drawAutotile*` functions into smaller visual-only helpers as long as they only read `state.maze`, `state.clock`, `state.levelIndex`, viewport state, and world theme data.
- Improve decoration placement rules if they remain visual-only and do not create, remove, block, or move gameplay cells.
- Consolidate duplicated mobile `.stage`/`#game-canvas` CSS only after visual QA, because those rules affect viewport fit but not game logic.

## 6. What Must Not Be Touched In A Maze-Visual Phase

- Math/question generation and validation.
- Player movement, swipe/joystick input, direction buffering, speed, and animation state.
- Enemy movement, chase/random logic, spawn logic, and collision interactions.
- Collision rules, especially `circleHitsWall()`, `isWallCell()`, and actor wall resolution.
- Logical maze generation in `createMaze()` unless the user explicitly approves a gameplay/map-layout phase.
- `enterLevel()` level lifecycle behavior except for reading the current world key.
- Collectible placement rules and scoring values.
- Character sprites, ghost sprites, boss sprites, and their rendering functions.
- Mission, lives, score, combo, question dialog, and HUD behavior.

## 7. Recommended Modular Maze Theme Plan

1. Freeze the gameplay contract: `state.maze[y][x] === 1` remains wall, `0` remains walkable, `TILE` remains the renderer unit, and collision continues to use the same grid.
2. Create a single `MAZE_WORLD_THEMES`/`MazeThemeRegistry` that owns visual tokens and reference-sheet crop roles for each world.
3. Replace multiple competing maze visual paths with one active renderer interface:
   `drawMazeWorldBoard({ maze, level, theme, sheet, clock, viewport })`.
4. Preserve a strict layer order:
   base floor -> walkable path material -> contact shadows -> raised wall mass -> wall sides/edges/corners -> safe world decor -> ambient effects -> gameplay objects -> characters/enemies -> HUD.
5. Make walls read as raised objects by drawing top faces, side faces, edge bevels, corner caps, and contact shadows from the same wall-neighbor mask.
6. Make paths read as lower lanes by using darker floor values, subtle material variation, and controlled lane highlights that never hide collectibles.
7. Treat reference images as material/shape guides, not as full-screen backgrounds. The renderer should use the same motifs and materials while preserving the existing playable maze grid.
8. Add deterministic decoration placement rules that avoid player/enemy lanes, collectible lines, and high-traffic intersections.
9. Validate each world visually at mobile portrait sizes: `360x800`, `390x844`, `414x896`, and `430x932`.
10. Keep the first implementation pass focused on Ice only, then reuse the same renderer contract for Lava, Ancient, and Diamond.

