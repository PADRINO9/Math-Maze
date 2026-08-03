#!/usr/bin/env python3
"""Pack the local Blender 3/4 wall modules into one atlas per world."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "art-src" / "maze" / "axonometric" / "v1" / "renders"
WORLDS = ("ice", "lava", "ancient", "diamond")
TILE = 256
ATLAS = 1024


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> None:
    release = {
        "renderer": "orthographic-3/4",
        "camera": {"azimuthDegrees": 10, "elevationDegrees": 56},
        "worlds": {},
        "license": "project-original",
    }
    for world in WORLDS:
        output = ROOT / "assets" / "maze" / world / "v4"
        output.mkdir(parents=True, exist_ok=True)
        atlas = Image.new("RGBA", (ATLAS, ATLAS), (0, 0, 0, 0))
        for mask in range(16):
            source = Image.open(SOURCE / world / f"wall-mask-{mask:02d}.png").convert("RGBA")
            if source.size != (TILE, TILE):
                source = source.resize((TILE, TILE), Image.Resampling.LANCZOS)
            atlas.alpha_composite(source, ((mask % 4) * TILE, (mask // 4) * TILE))
        atlas_path = output / "walls.png"
        atlas.save(atlas_path, optimize=True, compress_level=9)
        manifest = {
            "schemaVersion": 4,
            "renderer": "orthographic-3/4",
            "worldId": world,
            "atlas": "walls.png",
            "tileSize": TILE,
            "camera": release["camera"],
            "tiles": {
                f"wallMask{mask}": {
                    "x": (mask % 4) * TILE,
                    "y": (mask // 4) * TILE,
                    "w": TILE,
                    "h": TILE,
                }
                for mask in range(16)
            },
        }
        manifest_path = output / "walls.json"
        manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
        release["worlds"][world] = {
            "atlas": str(atlas_path.relative_to(ROOT)),
            "atlasSha256": sha256(atlas_path),
            "manifestSha256": sha256(manifest_path),
        }
    provenance = ROOT / "assets" / "maze" / "axonometric-v4-provenance.json"
    provenance.write_text(json.dumps(release, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(release, indent=2))


if __name__ == "__main__":
    main()
