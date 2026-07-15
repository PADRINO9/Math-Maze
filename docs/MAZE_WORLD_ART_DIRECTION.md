# Kaflul Maze World Art Direction

This document defines the visual contract for the playable maze worlds in Kaflul.
The maze must read as a premium, original, kid-friendly mobile game environment, not as a colored grid prototype.

## Global Rules

- The logical maze grid is gameplay-only. Visuals may add bevels, shadows, glow, material variation, and edge details, but must not change collision or movement.
- Every world is rendered in layers:
  1. Base floor layer
  2. Walkable path material layer
  3. Raised wall/block layer
  4. Edge, bevel, contact shadow, and rim-light layer
  5. World decoration layer
  6. Ambient effect layer
  7. Gameplay objects layer
  8. Characters and enemies layer
  9. HUD layer
- Walkable lanes must always be darker and calmer than raised walls.
- Walls must feel raised above the corridors through top highlights, lower side faces, and contact shadows.
- Decoration is allowed only when it does not hide the player, ghosts, collectibles, hazards, question flow, or path readability.
- Never place large decorative sprites directly under the player lane center.
- Never use a single full-screen reference image as the playable maze.
- Never tint one generic maze for all worlds.
- Collectibles must remain the brightest small objects in the corridor layer.
- Enemies and heroes must remain unchanged and must visually sit above the environment.

## Implementation Contract

- The playable maze must be rendered as an autotiled tilemap, not as independent colored rectangles.
- The renderer may generate its own local atlas at runtime, but all drawing must flow through repeatable tile roles: floor, floor variation, wall mass, exposed edge, corner, and sparse decor.
- Runtime atlases should sample the provided world reference sheets for floor, wall, wall-face, and decor crops, then reuse those crops as modular materials inside the real gameplay maze.
- Continuous floor and wall runs should be drawn as visual masses first; per-cell atlas details may be added only at low opacity so the maze does not become a checkerboard.
- Edge overlays are selected from neighboring wall/open cells. This preserves the gameplay grid while making walls read as connected structures.
- Reference sheets are direction for material, palette, depth, and mood. They must not be pasted as a single background image.
- Any external learning source or asset source must be free/legal. Do not use paywalled material or copied commercial game art.
- Useful free references for the rendering approach:
  - Tiled-style layer separation and map data thinking: https://doc.mapeditor.org/en/stable/reference/json-map-format/
  - Canvas atlas drawing via `drawImage`: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage
  - Free/CC0-style game-asset libraries can be inspected for style ideas, but the Kaflul maze must remain original.

## Ice World

### Core Mood
A cute, polished frozen maze: cold, magical, clean, and readable. It should feel like frosted glass and ice bricks, not flat cyan blocks.

### Main Palette
- Deep cold navy for playable corridors.
- Cyan-blue and frosted white for raised walls.
- Small white/cyan sparkle accents.
- Avoid full-screen cyan saturation.

### Floor Material
- Dark blue ice slabs with subtle cloudy variation.
- Low-contrast cracks and frost haze.
- The floor must be quiet under the player and ghosts.

### Wall Material
- Raised frosted glass or ice-brick blocks.
- Bright top highlights, darker blue side faces, and soft internal cracks.
- Edges should look beveled and rounded enough for a kid-friendly style.

### Edge Treatment
- Thin bright rim light on exposed wall edges.
- Dark contact shadow where the corridor touches a wall.
- Bottom side face visible on lower edges.

### Lighting Direction
- Soft cool light from the upper-left/top-center.
- Cyan glow only around wall tops, collectibles, and selected frost accents.

### Ambient Effects
- Very subtle snow dust and tiny glints.
- Effects must be sparse and slow.

### Obstacle Style
- Ice spikes, frozen blocks, crystal clusters, and small snow mounds.
- Obstacles are decorative only unless gameplay explicitly uses them.
- Keep them along wall edges or outside critical lanes.

### Decorative Motifs
- Frost cracks, snow dust, small crystalline sparkles, soft blue glows.

### Must Never Use
- Flat cyan rectangles.
- Heavy mechanical grid lines.
- Random large ice sprites over corridors.
- Horror-like darkness.

### Gameplay Readability
- Walls are brighter and raised.
- Corridors are darker and calmer.
- Collectibles remain small, bright, and separate from frost particles.

## Lava World

### Core Mood
Hot, dangerous, and arcade-readable without overwhelming the screen.

### Main Palette
- Charcoal and basalt black for floor and wall bases.
- Controlled orange/red magma accents.
- Small yellow-hot highlights only where needed.

### Floor Material
- Dark volcanic stone corridors with faint ash and cracks.
- Avoid making the whole floor glow.

### Wall Material
- Raised basalt blocks with chipped rock faces.
- Lava cracks should appear as accents, not as full-screen noise.

### Edge Treatment
- Warm orange rim on exposed wall seams.
- Dark contact shadow in lanes.
- Side faces should be darker than tops.

### Lighting Direction
- Low warm glow from cracks and occasional magma points.
- Ambient top light remains subtle so ghosts and heroes stand out.

### Ambient Effects
- Sparse ash particles.
- Heat shimmer only if it stays performant and readable.

### Obstacle Style
- Basalt pillars, small lava vents, broken volcanic rock.

### Decorative Motifs
- Controlled magma veins, ember dots, cracked basalt.

### Must Never Use
- Full-screen red/orange wash.
- Dense lava cracks under collectibles.
- Bright clutter that hides ghosts or the player.

### Gameplay Readability
- Corridors stay dark and matte.
- Lava glow is a warning/accent, never the default floor color.

## Ancient World

### Core Mood
An old multiplication temple: educational adventure, not generic desert.

### Main Palette
- Sandstone, aged beige, warm gray, muted teal accents.
- Sparse gold highlights.

### Floor Material
- Worn stone slabs with subtle cracks, dust, and age variation.
- Use quiet engraved lines, not a mechanical grid.

### Wall Material
- Carved stone walls with inset slabs and mild erosion.
- Teal/gold carvings can appear on exposed faces.

### Edge Treatment
- Warm top highlights.
- Deep contact shadows.
- Small chips and stone wear on corners.

### Lighting Direction
- Warm temple light from above.
- Teal magical accents should be rare and intentional.

### Ambient Effects
- Dust motes and occasional soft teal runes.

### Obstacle Style
- Broken columns, jars, tablets, engraved blocks, small plants/moss.

### Decorative Motifs
- Hebrew/math/rune-like engravings, multiplication temple markings, moss, cracks.

### Must Never Use
- Generic desert sand with no temple identity.
- Heavy gold everywhere.
- Busy carvings under gameplay objects.

### Gameplay Readability
- Teal collectibles must remain visually distinct from stone motifs.
- Engravings must be low contrast in walkable lanes.

## Diamond World

### Core Mood
Premium magical crystal cavern: bright, faceted, polished, but controlled.

### Main Palette
- Dark blue/purple base.
- Cyan, icy blue, violet, magenta highlights.
- White glints used sparingly.

### Floor Material
- Dark crystalline floor with subtle facets.
- Avoid full neon backgrounds.

### Wall Material
- Raised faceted crystal blocks.
- Edges should refract light with cyan/purple gradients.

### Edge Treatment
- Strong but thin highlight on exposed crystal edges.
- Darker blue/purple side faces.
- Small specular glints, not random gem clutter.

### Lighting Direction
- Cool magical light from wall facets and collectibles.
- Ambient purple-blue glow around the scene edges.

### Ambient Effects
- Sparse twinkles and prism glints.

### Obstacle Style
- Crystal clusters, faceted pillars, gem blocks.

### Decorative Motifs
- Triangular facets, prism highlights, controlled magical glow.

### Must Never Use
- Over-neon visuals.
- Random gems scattered through the lane center.
- Bright decoration that competes with collectibles.

### Gameplay Readability
- Player lanes must remain darker than walls.
- Pink/purple collectible glows should not blend into wall glints.

## Mobile Readability Rules

- Test at 360x800, 390x844, 414x896, and 430x932.
- The HUD must not cover critical gameplay information.
- No gameplay scrolling.
- The player should understand lanes within one second from a screenshot.
- If a detail looks good in desktop but hides collectibles on phone, remove or reduce it.
