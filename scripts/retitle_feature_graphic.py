"""Redraw the title column of the Play feature graphic (1024x500) in place.

The original was built by rebuild_store_art.py from an icon source that is no
longer on disk, so this repaints only the text: the cream band is restored from
a text-free column, the faint "?" watermark is re-applied exactly as that script
drew it, then the app name and a per-language tagline are written.

Usage: python scripts/retitle_feature_graphic.py
Writes assets/store/feature-graphic-1024x500.png (en-US) and
assets/store/listing/feature-graphic/<play_locale>.png for every listing.
"""
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

import locale_text as lt

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "assets/store/feature-graphic-1024x500.png"
NAME = "Date Guesser"
FW, FH = 1024, 500
BAND = (150, 350)          # cream band rows
CLEAN_X = 492              # band column clear of the icon tile shadow and the text
COL_X, COL_W = 520, 470    # text column, as rebuild_store_art.py

# Tagline = first line of each listing's full description.
def tagline(listing):
    return listing["full_description"].split("\n", 1)[0]


def clean_base(src):
    im = src.convert("RGBA")
    px = im.load()
    for y in range(BAND[0], BAND[1] + 1):
        c = px[CLEAN_X, y]
        for x in range(CLEAN_X, FW):
            px[x, y] = c
    wm = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
    ImageDraw.Draw(wm).text((880, 40), "?", font=ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 420),
                            fill=(255, 255, 255, 46))
    # Re-apply the watermark only inside the band; outside it the original is untouched.
    band = Image.new("L", (FW, FH), 0)
    ImageDraw.Draw(band).rectangle((CLEAN_X, BAND[0], FW, BAND[1]), fill=255)
    over = Image.alpha_composite(im, wm)
    return Image.composite(over, im, band)


def fit(d, text, path, start, floor):
    size = start
    while True:
        f = ImageFont.truetype(path, size)
        bb = d.textbbox((0, 0), text, font=f)
        if bb[2] - bb[0] <= COL_W or size <= floor:
            return f, bb
        size -= 2


def render(base, sub, lang):
    im = base.copy()
    d = ImageDraw.Draw(im)
    fonts = lt.fonts(lang)
    tf, tb = fit(d, NAME, "C:/Windows/Fonts/segoeuib.ttf", 80, 40)
    sf, sb = fit(d, sub, fonts["semi"], 34, 20)
    gap = 22
    block = (tb[3] - tb[1]) + gap + (sb[3] - sb[1])
    ty = (BAND[0] + BAND[1]) // 2 - block // 2
    d.text((COL_X - tb[0], ty - tb[1]), NAME, font=tf, fill=(60, 30, 5))
    d.text((COL_X - sb[0], ty + (tb[3] - tb[1]) + gap - sb[1]), sub, font=sf, fill=(110, 60, 15))
    return im.convert("RGB")


if __name__ == "__main__":
    base = clean_base(Image.open(BASE))
    out_dir = ROOT / "assets/store/listing/feature-graphic"
    out_dir.mkdir(exist_ok=True)
    for p in sorted((ROOT / "assets/store/listing").glob("*.json")):
        listing = json.loads(p.read_text(encoding="utf-8"))
        img = render(base, tagline(listing), listing["app_locale"])
        img.save(out_dir / f"{listing['play_locale']}.png", optimize=True)
        if listing["play_locale"] == "en-US":
            img.save(BASE, optimize=True)
        print(listing["play_locale"], tagline(listing))
