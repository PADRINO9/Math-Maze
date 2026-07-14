# Ice Maze V3 Asset Source

These assets are original, locally generated production artwork for כפלול / Math Maze.

- Blender source generator: `art-src/maze/ice/v3/generate_ice_v3_blender.py`
- Pipeline runner/contract validator: `tools/generate_ice_maze_v3_assets.mjs`
- Deterministic atlas packer: `tools/pack_ice_v3_runtime.py`
- Runtime atlas: `assets/maze/ice/v3/tileset.png`
- Runtime schema: `assets/maze/ice/v3/tileset.json`
- No third-party texture, stock image, or user-reference pixel is embedded.
- The non-shipping art-direction board contributes only high-level material and silhouette cues.

Regenerate the Blender source renders, atlas, manifest, contact sheet, and
provenance with:

```bash
/Users/eliran/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node tools/generate_ice_maze_v3_assets.mjs
```

Pack existing Blender renders only with `--pack-only`. The runner validates
all 25 required runtime roles and verifies the atlas/manifest SHA-256 hashes
against `provenance.json` before it reports success.
