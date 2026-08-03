# Maze Graphics Upgrade Spec

Date: 2026-07-03
Status: technical specification only. No code implementation in this phase.

## 1. Goal

Upgrade the playable maze visuals so the game looks like a polished mobile game while keeping gameplay unchanged.

The maze grid remains the single source of truth:

- `state.maze[y][x] === 1` means wall.
- `state.maze[y][x] === 0` means walkable floor.
- Collision remains grid-based.
- Movement, math, enemies, scoring, lives, missions, and character rendering must not change.

The new maze graphics system must support the four existing worlds:

1. `ice`
2. `lava`
3. `ancient`
4. `diamond`

The system should support image-based tilesets in the future, but must also work with procedural canvas rendering and existing primitives as fallback.

## 2. Non-Goals

- Do not change math logic.
- Do not change player movement logic.
- Do not change enemy movement logic.
- Do not change collision rules.
- Do not redesign heroes, ghosts, or bosses.
- Do not change the logical maze layout.
- Do not add decorative objects that block movement.
- Do not use a full-screen background image as a replacement for real maze rendering.

## 3. Core Architecture

Create a modular visual renderer that reads the existing maze grid and paints a richer world on top of the same logical cells.

Recommended public entry point:

```js
drawMazeGraphics({
  ctx,
  maze,
  level,
  worldKey,
  clock,
  tileSize,
  cols,
  rows,
  viewport,
  assets
});
```

This function must draw visuals only. It must not mutate gameplay state.

## 4. Required Render Layers

The renderer must use a stable layer order:

1. World base background
2. Walkable floor/path material
3. Floor variation and lane detail
4. Contact shadows around walls
5. Raised wall top faces
6. Wall side faces and bevels
7. Wall edge/corner highlights
8. Deterministic decorative scatter
9. Ambient VFX
10. Gameplay objects layer: collectibles, hazards, player, enemies, boss
11. HUD layer

Only layers 1 through 9 belong to the maze graphics system.

## 5. Theme Registry

Create one visual theme registry keyed by world id:

```js
const MAZE_GRAPHICS_THEMES = {
  ice: { ... },
  lava: { ... },
  ancient: { ... },
  diamond: { ... }
};
```

Each theme must include:

- `id`
- `palette`
- `floor`
- `wall`
- `collectible`
- `portal`
- `scatter`
- `ambient`
- `readability`
- `tileset`

Example shape:

```js
{
  id: "ice",
  palette: {
    base: ["#04111f", "#0a2f4a", "#061827"],
    floor: ["#08233a", "#0f3f61", "#092036"],
    wall: ["#68c8df", "#d8fbff", "#2f85a6"],
    accent: "#9ef7ff",
    shadow: "rgba(0, 8, 22, 0.55)"
  },
  floor: {
    material: "frosted-dark-ice",
    variation: 0.18,
    crackOpacity: 0.16
  },
  wall: {
    material: "raised-ice-brick",
    bevel: 5,
    sideDepth: 7,
    cornerStyle: "rounded-chipped"
  },
  scatter: {
    density: 0.06,
    allowedOn: ["wall-top", "outer-border"],
    forbiddenNearGameplayRadius: 1
  }
}
```

## 6. Tile Classification

For each cell, derive visual masks from the existing grid:

- `isWall`
- `isFloor`
- `openN`
- `openE`
- `openS`
- `openW`
- `wallNeighborN`
- `wallNeighborE`
- `wallNeighborS`
- `wallNeighborW`
- `cornerNE`
- `cornerSE`
- `cornerSW`
- `cornerNW`
- `isOuterBorder`
- `isDeadEnd`
- `isCorridor`
- `isIntersection`

These masks may change visual rendering only. They must not alter collision or pathfinding.

## 7. Deterministic Decorative Scatter

Decorative scatter must be deterministic, stable, and visual-only.

Rules:

- Use a deterministic hash from `worldKey`, `levelIndex`, `x`, and `y`.
- Never use `Math.random()` during draw.
- Never place scatter on walkable floor unless the scatter is tiny, flat, and non-blocking.
- Prefer wall-top, outer-border, and non-critical negative-space placement.
- Never place scatter on the player start zone.
- Never place scatter on the boss spawn zone.
- Never place scatter on collectible lanes when it reduces readability.
- Never place scatter where it can be mistaken for a collectible, hazard, player, or enemy.

Recommended helper:

```js
function deterministicCellNoise(worldKey, levelIndex, x, y) {
  // Returns a stable 0..1 value.
}
```

Recommended placement result:

```js
{
  type: "ice-spike-small",
  x,
  y,
  anchor: "wall-top",
  scale: 0.72,
  alpha: 0.86
}
```

Scatter output should be cached per `worldKey + levelIndex + maze signature`.

## 8. Image-Based Tileset Support

The system must support image tiles later without forcing image use now.

Theme tileset definition:

```js
tileset: {
  mode: "procedural", // "procedural" | "image" | "hybrid"
  source: "assets/reference/maze-worlds/world_ice.png",
  tileSize: 72,
  crops: {
    floor: { x: 22, y: 530, w: 142, h: 75 },
    floorAccent: { x: 190, y: 530, w: 146, h: 75 },
    wallTop: { x: 77, y: 386, w: 112, h: 48 },
    wallSide: { x: 77, y: 418, w: 112, h: 34 },
    collectible: { x: 24, y: 635, w: 42, h: 44 },
    bonusCollectible: { x: 65, y: 635, w: 42, h: 44 },
    portal: { x: 284, y: 363, w: 60, h: 116 }
  }
}
```

Fallback rule:

- If image assets are missing or not loaded, use procedural rendering from theme tokens.
- Fallback must preserve readability and world identity.

## 9. World Specifications

### Ice

Wall visual style:

- Raised frosted ice-brick walls.
- Light cyan/white top face with darker blue side face.
- Soft bevels, chipped corners, cloudy inner ice.
- Subtle cracks and frost strokes.
- Edge highlights should be bright but controlled.

Floor visual style:

- Dark cold-blue walkable corridors.
- Lower than wall surfaces.
- Subtle frozen stone/ice panels.
- Low-opacity cracks and frost dust.
- Avoid visible mechanical grid lines.

Collectible visual style:

- Small icy diamonds or snow-glow shards.
- High contrast against the dark floor.
- Soft cyan-white glow.
- Bonus collectible may use larger snowflake/diamond shape.

Portal/gate visual style:

- Optional visual-only icy swirl or frozen arch when a gameplay portal/gate exists.
- Must not be shown if the current level has no portal/gate gameplay.
- Must never imply a walkable exit unless the game actually supports it.

Random decorative scatter style:

- Small ice spikes, frost patches, frozen chips, snow dust.
- Prefer wall edges and outer border.
- Avoid large crystals inside narrow corridors.

Ambient VFX style:

- Slow drifting snow specks.
- Gentle cyan bloom.
- No blizzard density.
- Must not obscure ghosts, player, hazards, or collectibles.

Color palette:

- Base: deep navy, cold blue, dark teal.
- Wall: frosted cyan, pale ice, blue-shadow side faces.
- Accent: cyan-white glow.
- Shadow: dark blue-black.

Mobile readability rules:

- Walkable floor must be at least 35 percent darker than wall tops.
- Collectibles must remain brighter than the floor and smaller than the player.
- Snow particles must be sparse on 360px wide screens.
- Wall edges must stay readable even with camera crop.

### Lava

Wall visual style:

- Raised basalt and volcanic rock blocks.
- Dark top faces with glowing orange cracks.
- Side faces almost black with warm rim light.
- Cracks should be selective, not everywhere.

Floor visual style:

- Dark volcanic stone corridors.
- Warm low glow in cracks only.
- Avoid making the entire floor orange.
- Keep player and ghosts readable against dark floor.

Collectible visual style:

- Ember gems or hot orange shards.
- Bright core with small yellow/orange glow.
- Bonus collectible may look like a hotter molten crystal.

Portal/gate visual style:

- Optional molten ring or lava-forged arch only when gameplay needs it.
- Glow must not cover the player lane.

Random decorative scatter style:

- Small basalt chips, cooled lava cracks, ash marks, tiny ember vents.
- Decorative lava pools must be outside playable lanes or clearly flat/non-blocking.

Ambient VFX style:

- Sparse ember particles.
- Subtle heat shimmer if performance allows.
- Controlled orange accent, not full-screen red wash.

Color palette:

- Base: near-black brown, charcoal, deep red-brown.
- Wall: basalt, dark gray, controlled orange cracks.
- Accent: amber, magma orange, yellow highlight.
- Shadow: black with warm edge light.

Mobile readability rules:

- Orange effects must not hide collectibles.
- Hazards must be brighter/more animated than decorative lava cracks.
- Wall/floor separation must remain clear in low brightness.
- Avoid dense embers on small screens.

### Ancient

Wall visual style:

- Raised carved stone blocks.
- Sandstone/aged stone top faces.
- Slightly darker worn side faces.
- Engraved Hebrew/math/rune-like motifs used sparingly.
- Chips, moss, and cracks at edges.

Floor visual style:

- Old temple stone slabs.
- Subtle tile variation and erosion.
- Light sand/dust in corners.
- Not a generic desert floor; should feel like a multiplication temple.

Collectible visual style:

- Cyan/gold rune gems or glowing math tokens.
- Must read as collectible, not background engraving.
- Bonus collectible may use a brighter turquoise/gold mark.

Portal/gate visual style:

- Optional carved temple arch or rune ring only when gameplay needs it.
- Should feel ancient and educational-adventure.

Random decorative scatter style:

- Broken columns, tiny tablets, moss flecks, carved fragments.
- Only on wall tops, outer borders, or wide negative spaces.
- No tall object in narrow lanes.

Ambient VFX style:

- Soft dust motes.
- Very subtle gold/cyan magical glints.
- No heavy sandstorm.

Color palette:

- Base: dark olive-brown, aged stone, muted sand.
- Wall: sandstone, warm beige, weathered brown.
- Accent: turquoise/cyan and controlled gold.
- Shadow: dark brown.

Mobile readability rules:

- Engravings must be lower contrast than collectibles.
- Sand/dust should not make paths look blocked.
- Collectibles must stand out from gold accents.
- Wall edges must remain visible without relying only on color.

### Diamond

Wall visual style:

- Raised faceted crystal walls.
- Purple/blue/cyan prism faces.
- Bright edge highlights with controlled glow.
- Wall sides should be darker blue/purple to create depth.

Floor visual style:

- Dark magical cavern or polished crystal floor.
- Muted facets, low-opacity glints.
- Avoid over-neon full-screen glow.

Collectible visual style:

- Bright diamond shards or gem lights.
- Clear silhouette with white/cyan/pink sparkle.
- Bonus collectible may be larger and pink/purple.

Portal/gate visual style:

- Optional crystal arch or refractive portal only when gameplay needs it.
- Must be visually distinct from collectible diamonds.

Random decorative scatter style:

- Small crystals, gem chips, prism fragments.
- Use mostly at wall edges and border spaces.
- Avoid random gem clutter in playable lanes.

Ambient VFX style:

- Controlled shimmer particles.
- Occasional refractive glints.
- No excessive bloom that hides ghosts.

Color palette:

- Base: dark indigo, deep blue, black-violet.
- Wall: cyan crystal, purple facets, blue shadow.
- Accent: cyan, violet, magenta highlights.
- Shadow: navy/black.

Mobile readability rules:

- Crystal glints must not look like collectibles.
- Glow must not flatten wall/floor contrast.
- Ghost silhouettes must remain visible against purple/blue walls.
- Keep particle count lower on mobile.

## 10. Collectibles And Gameplay Object Readability

Collectibles are gameplay objects and must remain above maze decorative noise.

Rules:

- Collectibles should be drawn after maze layers.
- Maze graphics must reserve visual contrast around collectible lanes.
- Decorative scatter must not overlap collectible centers.
- Collectible glow should differ by world but remain consistent in size and behavior.
- Bonus collectibles must be visually distinct but not confused with hazards.

## 11. Mobile Portrait Requirements

Target viewports:

- `360x800`
- `390x844`
- `414x896`
- `430x932`

Rules:

- No horizontal or vertical page scrolling during gameplay.
- HUD must not cover important maze interactions.
- Wall and floor separation must be readable in one screenshot.
- Player, ghosts, collectibles, hazards, and boss must remain visually dominant over decoration.
- Reduce ambient particles and expensive effects when `MOBILE_RUNTIME.reducedEffects` is true.
- Keep draw calls predictable by caching atlases and scatter decisions.

## 12. Recommended Files And Modules

Recommended incremental structure:

- `game.js`
  - Keep as the integration point during the first implementation.
  - Replace direct maze rendering calls only after the renderer is ready.

- `maze-graphics-themes.js`
  - Defines `MAZE_GRAPHICS_THEMES`.
  - Contains no gameplay code.
  - Loaded before `game.js` or merged into `game.js` if the project avoids extra script files.

- `maze-graphics-renderer.js`
  - Defines `drawMazeGraphics()`.
  - Owns layer order and visual draw helpers.
  - Reads maze state but never mutates it.

- `maze-graphics-atlas.js`
  - Optional helper for future image-based tilesets.
  - Owns tile atlas creation, crop extraction, and fallback procedural tiles.

- `maze-graphics-scatter.js`
  - Optional helper for deterministic scatter placement and caching.
  - Must expose pure helpers that depend only on world key, level index, maze signature, and grid position.

If the project should remain single-file for now, create equivalent sections in `game.js` with clear headings:

- Maze Graphics: Theme Registry
- Maze Graphics: Atlas
- Maze Graphics: Scatter
- Maze Graphics: Renderer
- Maze Graphics: Integration

## 13. Integration Plan

Phase A: prepare architecture only

- Add theme registry.
- Add deterministic cell hash helper.
- Add maze signature helper for scatter caching.
- Add renderer shell with same current visual output.

Phase B: replace active visual path

- Keep `createMaze`, `isWallCell`, and collision untouched.
- Replace `drawReferenceMazeBoard()` internals with `drawMazeGraphics()`.
- Preserve the same render order around hazards, collectibles, player, enemies, boss, and HUD.

Phase C: polish worlds

- Start with Ice.
- Validate at mobile portrait sizes.
- Then apply the same system to Lava, Ancient, and Diamond.

## 14. Verification Checklist

For every implementation pass:

- `pnpm run build` passes.
- The game loads locally.
- No math behavior changed.
- Player collision against walls is unchanged.
- Enemy behavior is unchanged.
- The player can still identify paths instantly.
- Decorative scatter is deterministic across reloads for the same level.
- Decorative scatter never blocks or implies blocked movement.
- Each world is visually distinct.
- Mobile portrait layout remains clean.

