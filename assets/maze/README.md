# Maze Asset Folders

This directory is the future home for production maze-world assets.

The current game still renders the maze through the existing canvas renderer.
These folders are configuration and asset-organization scaffolding only.

## Folder Purpose

- `ice/` - assets and configuration for the Ice world maze.
- `lava/` - assets and configuration for the Lava world maze.
- `ancient/` - assets and configuration for the Ancient world maze.
- `diamond/` - assets and configuration for the Diamond world maze.

Each folder contains a `theme.json` file with the basic visual tokens for that world.

## Future Tileset Images

Future production tileset images should be placed inside the matching world folder.

The renderer now supports an optional single-atlas tileset per world:

- `assets/maze/ice/tileset.png`
- `assets/maze/ice/tileset.json`
- `assets/maze/lava/tileset.png`
- `assets/maze/lava/tileset.json`
- `assets/maze/ancient/tileset.png`
- `assets/maze/ancient/tileset.json`
- `assets/maze/diamond/tileset.png`
- `assets/maze/diamond/tileset.json`

`tileset.png` and `tileset.json` are both optional. If either file is missing,
the game falls back to the procedural canvas renderer and must continue to work.

By default, optional tileset probing is disabled in code so the current game does
not request missing future assets or emit 404 errors. After adding real tileset
files, enable that world in `MAZE_OPTIONAL_TILESETS` inside `game.js` by changing
its `mode` from `"procedural"` to `"image"` or `"hybrid"`.

When `tileset.json` is missing, `tileset.png` is treated as a simple horizontal
atlas in this order:

1. `floor`
2. `floorAlt`
3. `wall`
4. `wallAlt`
5. `edgeN`
6. `edgeE`
7. `edgeS`
8. `edgeW`
9. `cornerNE`
10. `cornerSE`
11. `cornerSW`
12. `cornerNW`
13. `decorA`
14. `decorB`

Use `tileset.json` when the atlas uses a custom layout. Supported fields include:

```json
{
  "tileSize": 72,
  "atlas": "tileset.png",
  "tiles": {
    "floor": { "x": 0, "y": 0, "w": 72, "h": 72 },
    "floorAlt": { "x": 72, "y": 0, "w": 72, "h": 72 },
    "wall": { "x": 0, "y": 72, "w": 72, "h": 72 },
    "wallAlt": { "x": 72, "y": 72, "w": 72, "h": 72 },
    "edgeN": { "x": 144, "y": 72, "w": 72, "h": 72 },
    "collectible": { "x": 0, "y": 144, "w": 72, "h": 72 },
    "bonusCollectible": { "x": 72, "y": 144, "w": 72, "h": 72 },
    "portal": { "x": 144, "y": 144, "w": 72, "h": 72 },
    "decorA": { "x": 216, "y": 144, "w": 72, "h": 72 },
    "decorB": { "x": 288, "y": 144, "w": 72, "h": 72 }
  }
}
```

The current phase wires the maze atlas roles. `collectible`, `bonusCollectible`,
and `portal` are reserved in the JSON contract for future integration.

Recommended future files:

- `floor-base.png`
- `floor-variant-01.png`
- `wall-top.png`
- `wall-side.png`
- `wall-edge-n.png`
- `wall-edge-e.png`
- `wall-edge-s.png`
- `wall-edge-w.png`
- `corner-ne.png`
- `corner-se.png`
- `corner-sw.png`
- `corner-nw.png`
- `collectible.png`
- `collectible-bonus.png`
- `portal.png`
- `decor-01.png`
- `decor-02.png`
- `particle.png`

## Reference Images

The current reference images in `assets/reference/maze-worlds/` and `docs/references/maze/`
are not production assets. They are visual references and temporary source material only.

Do not treat those files as final game tilesets.

## Naming Conventions

- Use lowercase filenames.
- Use hyphen-separated words.
- Include the asset role in the filename.
- Keep world-specific assets inside their own world folder.
- Prefer PNG for raster tiles with transparency.
- Prefer WebP only after confirming Android/iOS packaging support.

Examples:

- `assets/maze/ice/wall-top.png`
- `assets/maze/lava/floor-variant-01.png`
- `assets/maze/ancient/decor-tablet-01.png`
- `assets/maze/diamond/collectible-bonus.png`

## Gameplay Rule

Maze assets are visual only. They must never change movement, collision, math logic,
enemy behavior, collectible placement, score, lives, or level rules.
