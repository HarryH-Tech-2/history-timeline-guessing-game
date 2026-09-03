"""Render 512x512 Play Games achievement icons and build the Play Console import ZIP.

    npm run achievements:export   # writes achievements.json + the three Play CSVs
    python scripts/achievementIcons.py   # renders icons, zips CSVs + icons for upload

Each icon is the achievement's emoji badge on the app's dark warm charcoal,
inside a ring whose metal follows the points tier (bronze -> copper -> gold ->
platinum). Play shows achievement icons cropped to a circle in some surfaces,
so everything that matters sits well inside the inscribed circle.

Requires Pillow >= 8 and Windows' Segoe UI Emoji (colour glyphs). On another
OS point EMOJI_FONT at Noto Color Emoji.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "assets" / "store" / "achievements"
ICON_DIR = OUT_DIR / "icons"
MANIFEST = OUT_DIR / "achievements.json"
PLAY_DIR = OUT_DIR / "play-import"
PLAY_CSVS = (
    "AchievementsMetadata.csv",
    "AchievementsLocalizations.csv",
    "AchievementsIconsMappings.csv",
)
ZIP_PATH = OUT_DIR / "play-achievements-import.zip"
EMOJI_FONT = Path(r"C:\Windows\Fonts\seguiemj.ttf")

SIZE = 512
SCALE = 4  # render big, downsample for smooth ring edges

BG = (21, 18, 16, 255)          # bg.raised (dark theme)
DISC = (31, 25, 19, 255)        # bg.overlay (dark theme)
INK = (247, 242, 234, 255)      # ink.primary (dark theme)

# Ring metal by points tier.
TIERS = [
    (10, ((176, 112, 58, 255), (214, 156, 104, 255))),    # bronze
    (30, ((232, 134, 43, 255), (245, 178, 102, 255))),    # copper (brand accent)
    (60, ((217, 178, 60, 255), (240, 214, 130, 255))),    # gold
    (10_000, ((205, 206, 210, 255), (240, 240, 244, 255))),  # platinum
]


def tier_colours(points: int):
    for ceiling, colours in TIERS:
        if points <= ceiling:
            return colours
    return TIERS[-1][1]


def render(emoji: str, points: int) -> Image.Image:
    big = SIZE * SCALE
    img = Image.new("RGBA", (big, big), BG)
    draw = ImageDraw.Draw(img)

    base, highlight = tier_colours(points)
    ring_outer = 20 * SCALE
    ring_width = 16 * SCALE

    # Disc with a metal ring: a highlight arc on the upper-left gives it a lip.
    bbox = [ring_outer, ring_outer, big - ring_outer, big - ring_outer]
    draw.ellipse(bbox, fill=base)
    draw.arc(bbox, start=190, end=330, fill=highlight, width=ring_width // 2)
    inner = [b + (ring_width if i < 2 else -ring_width) for i, b in enumerate(bbox)]
    draw.ellipse(inner, fill=DISC)
    # Thin inner hairline so the emoji sits on a defined plate.
    hair = [b + (6 * SCALE if i < 2 else -6 * SCALE) for i, b in enumerate(inner)]
    draw.ellipse(hair, outline=(base[0], base[1], base[2], 110), width=2 * SCALE)

    # The emoji, centred by its rendered bounds. Variation selectors are
    # stripped: Segoe measures them as a blank glyph box and off-centres the art.
    glyph = emoji.replace("\ufe0f", "")
    font = ImageFont.truetype(str(EMOJI_FONT), 230 * SCALE)  # ~230px at 1x
    layer = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    ldraw = ImageDraw.Draw(layer)
    left, top, right, bottom = ldraw.textbbox((0, 0), glyph, font=font, embedded_color=True)
    x = (big - (right - left)) // 2 - left
    y = (big - (bottom - top)) // 2 - top
    ldraw.text((x, y), glyph, font=font, embedded_color=True)
    img.alpha_composite(layer)

    return img.resize((SIZE, SIZE), Image.LANCZOS)


def main() -> int:
    if not MANIFEST.exists():
        print(f"Manifest missing: {MANIFEST}. Run `npm run achievements:export` first.")
        return 1
    if not EMOJI_FONT.exists():
        print(f"Emoji font missing: {EMOJI_FONT}")
        return 1

    ICON_DIR.mkdir(parents=True, exist_ok=True)
    rows = json.loads(MANIFEST.read_text("utf8"))
    for row in rows:
        icon = render(row["emoji"], int(row["points"]))
        icon.convert("RGB").save(ICON_DIR / f"{row['id']}.png", optimize=True)
    print(f"Rendered {len(rows)} icons to {ICON_DIR}")

    # Play Console import bundle: the three CSVs from achievementsCsv.ts plus
    # every icon, flat at the ZIP root (no folders), each file under 1 MB.
    if not all((PLAY_DIR / name).exists() for name in PLAY_CSVS):
        print(f"Play CSVs missing in {PLAY_DIR}; run `npm run achievements:export` first.")
        return 1
    with ZipFile(ZIP_PATH, "w", ZIP_DEFLATED) as bundle:
        for name in PLAY_CSVS:
            bundle.write(PLAY_DIR / name, arcname=name)
        for row in rows:
            icon_path = ICON_DIR / f"{row['id']}.png"
            if icon_path.stat().st_size >= 1_000_000:
                print(f"{icon_path.name} is over Play's 1 MB per-file limit")
                return 1
            bundle.write(icon_path, arcname=icon_path.name)
    print(f"Wrote {ZIP_PATH} ({ZIP_PATH.stat().st_size // 1024} KB) — upload this in Play Console")
    return 0


if __name__ == "__main__":
    sys.exit(main())
