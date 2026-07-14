#!/usr/bin/env python3
"""Pack deterministic Blender ice-v3 renders into one runtime atlas.

The source renders are original project assets generated locally by
art-src/maze/ice/v3/generate_ice_v3_blender.py. Pillow is used only for atlas
packing, a subtle seamless floor material, gutters, and the QA contact sheet.
"""

from __future__ import annotations

import hashlib
import json
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "art-src" / "maze" / "ice" / "v3" / "renders"
OUTPUT = ROOT / "assets" / "maze" / "ice" / "v3"
ATLAS_SIZE = 2048
WALL_SIZE = 256
FLOOR_SIZE = 256
ITEM_SIZE = 128
GUTTER = 12


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def rgba(path: Path, size: tuple[int, int]) -> Image.Image:
    image = Image.open(path).convert("RGBA")
    if image.size != size:
        image = image.resize(size, Image.Resampling.LANCZOS)
    return image


def paste_with_gutter(atlas: Image.Image, image: Image.Image, x: int, y: int, gutter: int = GUTTER) -> None:
    width, height = image.size
    atlas.alpha_composite(image, (x, y))
    left = image.crop((0, 0, 1, height)).resize((gutter, height))
    right = image.crop((width - 1, 0, width, height)).resize((gutter, height))
    top = image.crop((0, 0, width, 1)).resize((width, gutter))
    bottom = image.crop((0, height - 1, width, height)).resize((width, gutter))
    atlas.alpha_composite(left, (x - gutter, y))
    atlas.alpha_composite(right, (x + width, y))
    atlas.alpha_composite(top, (x, y - gutter))
    atlas.alpha_composite(bottom, (x, y + height))
    corners = {
        (x - gutter, y - gutter): image.crop((0, 0, 1, 1)),
        (x + width, y - gutter): image.crop((width - 1, 0, width, 1)),
        (x - gutter, y + height): image.crop((0, height - 1, 1, height)),
        (x + width, y + height): image.crop((width - 1, height - 1, width, height)),
    }
    for position, corner in corners.items():
        atlas.alpha_composite(corner.resize((gutter, gutter)), position)


def create_floor_variant(seed: int) -> Image.Image:
    rng = random.Random(9107 + seed * 101)
    size = FLOOR_SIZE
    pixels = Image.new("RGBA", (size, size), (8, 35, 56, 255))
    data = pixels.load()
    phase = seed * 0.41
    for y in range(size):
        for x in range(size):
            u = x / size
            v = y / size
            shared = (
                math.sin(math.tau * (u * 2 + v + 0.17)) * 3.2
                + math.cos(math.tau * (u - v * 2 + 0.31)) * 2.4
                + math.sin(math.tau * (u * 3 + v * 3)) * 1.6
            )
            local = math.sin(math.tau * (u * 2 + v * 2 + phase)) * 1.25
            vignette = max(0.0, 1.0 - math.hypot(u - 0.46, v - 0.4) * 1.55)
            data[x, y] = (
                int(8 + shared * 0.34 + local * 0.2 + vignette * 5),
                int(35 + shared * 0.72 + local * 0.35 + vignette * 13),
                int(56 + shared * 1.05 + local * 0.55 + vignette * 19),
                255,
            )

    detail = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(detail, "RGBA")
    for _ in range(5):
        x = rng.randint(34, size - 70)
        y = rng.randint(34, size - 70)
        points = [(x, y)]
        for segment in range(rng.randint(3, 5)):
            x += rng.randint(12, 27)
            y += rng.randint(-12, 14)
            points.append((x, y))
            if segment == 1:
                draw.line((x, y, x + rng.randint(7, 15), y - rng.randint(8, 16)), fill=(154, 225, 242, 33), width=1)
        draw.line(points, fill=(184, 237, 249, rng.randint(27, 44)), width=1)
    for _ in range(7):
        x = rng.randint(22, size - 22)
        y = rng.randint(22, size - 22)
        radius = rng.choice((1, 1, 2))
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=(181, 238, 249, 28))
    detail = detail.filter(ImageFilter.GaussianBlur(0.35))
    return Image.alpha_composite(pixels, detail)


def add_crop(crops: dict[str, dict[str, int]], name: str, x: int, y: int, width: int, height: int) -> None:
    crops[name] = {"x": x, "y": y, "w": width, "h": height}


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    atlas = Image.new("RGBA", (ATLAS_SIZE, ATLAS_SIZE), (0, 0, 0, 0))
    crops: dict[str, dict[str, int]] = {}

    wall_origin = (GUTTER, GUTTER)
    wall_step = WALL_SIZE + GUTTER * 2
    for mask in range(16):
        column = mask % 4
        row = mask // 4
        x = wall_origin[0] + column * wall_step
        y = wall_origin[1] + row * wall_step
        wall = rgba(SOURCE / "walls" / f"wall-mask-{mask:02d}.png", (WALL_SIZE, WALL_SIZE))
        paste_with_gutter(atlas, wall, x, y)
        add_crop(crops, f"wallMask{mask}", x, y, WALL_SIZE, WALL_SIZE)

    floor_y = GUTTER + wall_step * 4
    for variant in range(4):
        x = GUTTER + variant * wall_step
        floor = create_floor_variant(variant)
        paste_with_gutter(atlas, floor, x, floor_y)
        add_crop(crops, f"floor{variant}", x, floor_y, FLOOR_SIZE, FLOOR_SIZE)

    item_step = ITEM_SIZE + GUTTER * 2
    item_y = floor_y + FLOOR_SIZE + GUTTER * 2
    for frame in range(8):
        x = GUTTER + frame * item_step
        path_item = rgba(SOURCE / "path-shard" / f"frame-{frame:02d}.png", (ITEM_SIZE, ITEM_SIZE))
        paste_with_gutter(atlas, path_item, x, item_y)
        add_crop(crops, f"collectibleFrame{frame}", x, item_y, ITEM_SIZE, ITEM_SIZE)

    power_y = item_y + item_step
    for frame in range(8):
        x = GUTTER + frame * item_step
        power_item = rgba(SOURCE / "power-crystal" / f"frame-{frame:02d}.png", (ITEM_SIZE, ITEM_SIZE))
        paste_with_gutter(atlas, power_item, x, power_y)
        add_crop(crops, f"powerFrame{frame}", x, power_y, ITEM_SIZE, ITEM_SIZE)

    bonus_y = power_y + item_step
    bonus_x = GUTTER
    bonus = rgba(SOURCE / "bonus-crystal" / "bonus-crystal.png", (ITEM_SIZE, ITEM_SIZE))
    paste_with_gutter(atlas, bonus, bonus_x, bonus_y)
    add_crop(crops, "bonusCollectible", bonus_x, bonus_y, ITEM_SIZE, ITEM_SIZE)

    for role, frame in (("collectible0", 0), ("collectible1", 2), ("collectible2", 5)):
        crops[role] = dict(crops[f"collectibleFrame{frame}"])
    crops["powerCollectible"] = dict(crops["powerFrame0"])

    atlas_path = OUTPUT / "tileset.png"
    atlas.save(atlas_path, optimize=True, compress_level=9)

    manifest = {
        "schemaVersion": 3,
        "renderer": "modular-v3",
        "worldId": "ice",
        "atlas": "tileset.png",
        "atlasSize": {"width": ATLAS_SIZE, "height": ATLAS_SIZE},
        "tileSize": WALL_SIZE,
        "maskBits": {"N": 1, "E": 2, "S": 4, "W": 8},
        "source": "original local Blender procedural render",
        "tiles": crops,
    }
    manifest_path = OUTPUT / "tileset.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

    preview = Image.new("RGB", (1280, 1080), (4, 15, 29))
    for mask in range(16):
        crop = crops[f"wallMask{mask}"]
        tile = atlas.crop((crop["x"], crop["y"], crop["x"] + crop["w"], crop["y"] + crop["h"]))
        tile = tile.resize((220, 220), Image.Resampling.LANCZOS)
        preview.paste(tile, (28 + (mask % 4) * 252, 24 + (mask // 4) * 244), tile)
    floor = create_floor_variant(0).resize((220, 220), Image.Resampling.LANCZOS)
    preview.paste(floor.convert("RGB"), (1036, 24))
    item = rgba(SOURCE / "path-shard" / "frame-00.png", (ITEM_SIZE, ITEM_SIZE)).resize((150, 150), Image.Resampling.LANCZOS)
    preview.paste(item, (1070, 300), item)
    power = rgba(SOURCE / "power-crystal" / "frame-00.png", (ITEM_SIZE, ITEM_SIZE)).resize((180, 180), Image.Resampling.LANCZOS)
    preview.paste(power, (1055, 490), power)
    preview_path = OUTPUT / "contact-sheet.png"
    preview.save(preview_path, optimize=True)

    release = {
        "generator": "tools/pack_ice_v3_runtime.py",
        "atlasSha256": sha256(atlas_path),
        "manifestSha256": sha256(manifest_path),
        "wallMasks": 16,
        "floorVariants": 4,
        "collectibleFrames": 8,
        "powerFrames": 8,
        "license": "project-original",
    }
    (OUTPUT / "provenance.json").write_text(json.dumps(release, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"atlas": str(atlas_path), "manifest": str(manifest_path), "preview": str(preview_path), **release}, indent=2))


if __name__ == "__main__":
    main()
