from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "store-assets" / "google-play" / "he-IL"
SCREENSHOTS = OUT / "screenshots"

ICON_SOURCE = ROOT / "assets" / "generated" / "bifly-expression-idle.png"
LOGO_SOURCE = ROOT / "assets" / "kaflul-logo-official.png"
FEATURE_SOURCE = OUT / "feature-graphic-source-v1.png"

SCREENSHOT_SOURCES = {
    "01-gameplay-sun-garden.png": (
        ROOT
        / "docs"
        / "visual-proof-screenshots"
        / "world1-reimagine"
        / "final-authored"
        / "sun-garden"
        / "final-authored-sun-garden-mobile-390x844.png"
    ),
    "02-multiplication-question.png": (
        ROOT
        / "docs"
        / "visual-proof-screenshots"
        / "world1-reimagine"
        / "final-authored"
        / "sun-garden"
        / "final-authored-sun-garden-mobile-question-390x844.png"
    ),
    "03-lava-world.png": (
        ROOT
        / "docs"
        / "visual-proof-screenshots"
        / "stage-boss-telegram"
        / "stage-2-lava-390x844.png"
    ),
    "04-home-screen.png": OUT / "sources" / "home-native-432x936.png",
    "05-division-question.png": (
        ROOT
        / "docs"
        / "visual-proof-screenshots"
        / "division-mode"
        / "android-division-question-1.2.png"
    ),
    "06-boss-battle.png": (
        ROOT
        / "docs"
        / "visual-proof-screenshots"
        / "boss-encounter"
        / "android-16-boss-after-hit-1.3.png"
    ),
}

BACKGROUND = (5, 7, 11, 255)
CYAN = (104, 231, 255, 75)
MIB = 1024 * 1024


def contain(image: Image.Image, max_width: int, max_height: int) -> Image.Image:
    copy = image.copy()
    copy.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
    return copy


def trim_transparent_margins(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    bounds = rgba.getchannel("A").getbbox()
    return rgba.crop(bounds) if bounds else rgba


def paste_center(
    canvas: Image.Image, image: Image.Image, center_x: float, center_y: float
) -> None:
    x = round(center_x - image.width / 2)
    y = round(center_y - image.height / 2)
    canvas.alpha_composite(image, (x, y))


def make_play_icon() -> Image.Image:
    size = 512
    canvas = Image.new("RGBA", (size, size), BACKGROUND)
    draw = ImageDraw.Draw(canvas, "RGBA")
    inset = round(size * 0.055)
    draw.rounded_rectangle(
        (inset, inset, size - inset, size - inset),
        radius=round(size * 0.22),
        outline=CYAN,
        width=round(size * 0.025),
    )
    icon_source = trim_transparent_margins(Image.open(ICON_SOURCE))
    icon = contain(
        icon_source, round(size * 0.68), round(size * 0.68)
    )
    paste_center(canvas, icon, size / 2, size / 2)
    return canvas


def make_feature_graphic() -> Image.Image:
    background = ImageOps.fit(
        Image.open(FEATURE_SOURCE).convert("RGB"),
        (1024, 500),
        method=Image.Resampling.LANCZOS,
        centering=(0.5, 0.5),
    ).convert("RGBA")

    logo = contain(Image.open(LOGO_SOURCE).convert("RGBA"), 390, 160)
    logo_y = 86

    glow = Image.new("RGBA", background.size, (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow, "RGBA")
    glow_draw.ellipse(
        (
            512 - round(logo.width * 0.64),
            logo_y - round(logo.height * 0.42),
            512 + round(logo.width * 0.64),
            logo_y + round(logo.height * 0.58),
        ),
        fill=(5, 14, 35, 92),
    )
    background.alpha_composite(glow.filter(ImageFilter.GaussianBlur(32)))
    paste_center(background, logo, 512, logo_y)
    return background.convert("RGB")


def make_store_screenshot(source: Path) -> Image.Image:
    source_image = Image.open(source).convert("RGB")
    target_size = (1080, 1920)

    background = ImageOps.fit(
        source_image,
        target_size,
        method=Image.Resampling.LANCZOS,
        centering=(0.5, 0.5),
    ).filter(ImageFilter.GaussianBlur(36))
    shade = Image.new("RGBA", target_size, (3, 8, 18, 112))
    background = Image.alpha_composite(background.convert("RGBA"), shade)

    scale = min(
        target_size[0] / source_image.width,
        target_size[1] / source_image.height,
    )
    foreground = source_image.resize(
        (
            round(source_image.width * scale),
            round(source_image.height * scale),
        ),
        Image.Resampling.LANCZOS,
    )
    x = (target_size[0] - foreground.width) // 2
    y = (target_size[1] - foreground.height) // 2

    shadow = Image.new("RGBA", target_size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow, "RGBA")
    shadow_draw.rounded_rectangle(
        (x - 10, y - 10, x + foreground.width + 10, y + foreground.height + 10),
        radius=18,
        fill=(0, 0, 0, 115),
    )
    background.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(18)))
    background.alpha_composite(foreground.convert("RGBA"), (x, y))
    return background.convert("RGB")


def has_alpha(image: Image.Image) -> bool:
    return image.mode in {"RGBA", "LA"} or "transparency" in image.info


def validate_outputs() -> None:
    icon_path = OUT / "play-icon-512.png"
    with Image.open(icon_path) as icon:
        assert icon.size == (512, 512), f"Invalid Play icon size: {icon.size}"
        assert has_alpha(icon), "Play icon must preserve alpha"
    assert icon_path.stat().st_size <= MIB, "Play icon exceeds 1 MiB"

    feature_path = OUT / "feature-graphic-1024x500.png"
    with Image.open(feature_path) as feature:
        assert feature.size == (1024, 500), f"Invalid feature size: {feature.size}"
        assert not has_alpha(feature), "Feature graphic must not have alpha"

    for filename in SCREENSHOT_SOURCES:
        screenshot_path = SCREENSHOTS / filename
        with Image.open(screenshot_path) as screenshot:
            assert screenshot.size == (1080, 1920), (
                f"Invalid screenshot size for {filename}: {screenshot.size}"
            )
            assert not has_alpha(screenshot), f"Screenshot has alpha: {filename}"
            short_side, long_side = sorted(screenshot.size)
            assert 320 <= short_side and long_side <= 3840
            assert long_side <= short_side * 2
        assert screenshot_path.stat().st_size <= 8 * MIB, (
            f"Screenshot exceeds 8 MiB: {filename}"
        )


def main() -> None:
    SCREENSHOTS.mkdir(parents=True, exist_ok=True)

    make_play_icon().save(OUT / "play-icon-512.png", optimize=True)
    make_feature_graphic().save(OUT / "feature-graphic-1024x500.png", optimize=True)

    for filename, source in SCREENSHOT_SOURCES.items():
        if not source.is_file():
            raise FileNotFoundError(f"Missing screenshot source: {source}")
        make_store_screenshot(source).save(SCREENSHOTS / filename, optimize=True)

    validate_outputs()
    print(
        f"[google-play-assets] generated and validated assets in "
        f"{OUT.relative_to(ROOT)}"
    )


if __name__ == "__main__":
    main()
