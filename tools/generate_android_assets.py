from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
RES = ROOT / "android" / "app" / "src" / "main" / "res"
# Use the clean expression export for launcher surfaces. The gameplay sprite has
# a semi-transparent mid-face texture that becomes a dark stripe after Android
# downsizes and composites legacy launcher icons over a dark background.
ICON_SOURCE = ROOT / "assets" / "generated" / "bifly-expression-idle.png"
LOGO_SOURCE = ROOT / "assets" / "kaflul-logo-official.png"

BACKGROUND = (5, 7, 11, 255)
CYAN = (104, 231, 255, 75)
GOLD = (255, 216, 74, 120)

ICON_SIZES = {
    "mipmap-mdpi": (48, 108),
    "mipmap-hdpi": (72, 162),
    "mipmap-xhdpi": (96, 216),
    "mipmap-xxhdpi": (144, 324),
    "mipmap-xxxhdpi": (192, 432),
}


def contain(image, max_width, max_height):
    copy = image.copy()
    copy.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
    return copy


def paste_center(canvas, image, center_x, center_y):
    x = round(center_x - image.width / 2)
    y = round(center_y - image.height / 2)
    canvas.alpha_composite(image, (x, y))


def make_launcher(size):
    canvas = Image.new("RGBA", (size, size), BACKGROUND)
    draw = ImageDraw.Draw(canvas, "RGBA")
    inset = max(2, round(size * 0.08))
    draw.rounded_rectangle(
        (inset, inset, size - inset, size - inset),
        radius=round(size * 0.22),
        outline=CYAN,
        width=max(1, round(size * 0.035)),
    )
    draw.ellipse(
        (round(size * 0.18), round(size * 0.18), round(size * 0.82), round(size * 0.82)),
        outline=GOLD,
        width=max(1, round(size * 0.025)),
    )

    icon = contain(Image.open(ICON_SOURCE).convert("RGBA"), round(size * 0.78), round(size * 0.78))
    paste_center(canvas, icon, size / 2, size / 2)
    return canvas


def make_foreground(size):
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    icon = contain(Image.open(ICON_SOURCE).convert("RGBA"), round(size * 0.54), round(size * 0.54))
    paste_center(canvas, icon, size / 2, size / 2)
    return canvas


def make_splash(width, height):
    canvas = Image.new("RGBA", (width, height), BACKGROUND)
    draw = ImageDraw.Draw(canvas, "RGBA")

    grid_step = max(32, min(width, height) // 12)
    for x in range(0, width + grid_step, grid_step):
        draw.line((x, 0, x, height), fill=(104, 231, 255, 18), width=max(1, width // 360))
    for y in range(0, height + grid_step, grid_step):
        draw.line((0, y, width, y), fill=(104, 231, 255, 18), width=max(1, height // 640))

    glow = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow, "RGBA")
    radius = round(min(width, height) * 0.33)
    glow_draw.ellipse(
        (width // 2 - radius, height // 2 - radius, width // 2 + radius, height // 2 + radius),
        fill=(104, 231, 255, 38),
    )
    canvas.alpha_composite(glow.filter(ImageFilter.GaussianBlur(radius=max(12, radius // 3))))

    logo = contain(Image.open(LOGO_SOURCE).convert("RGBA"), round(width * 0.68), round(height * 0.18))
    icon = contain(Image.open(ICON_SOURCE).convert("RGBA"), round(width * 0.3), round(height * 0.3))

    if height >= width:
        paste_center(canvas, logo, width / 2, height * 0.34)
        paste_center(canvas, icon, width / 2, height * 0.56)
    else:
        paste_center(canvas, logo, width * 0.52, height * 0.42)
        paste_center(canvas, icon, width * 0.25, height * 0.5)

    return canvas.convert("RGB")


for directory, (launcher_size, foreground_size) in ICON_SIZES.items():
    target_dir = RES / directory
    make_launcher(launcher_size).save(target_dir / "ic_launcher.png")
    make_launcher(launcher_size).save(target_dir / "ic_launcher_round.png")
    make_foreground(foreground_size).save(target_dir / "ic_launcher_foreground.png")

for splash_path in sorted(RES.glob("drawable*/splash.png")):
    with Image.open(splash_path) as existing:
        splash = make_splash(existing.width, existing.height)
    splash.save(splash_path)

print("[android:assets] generated launcher icons and splash screens")
