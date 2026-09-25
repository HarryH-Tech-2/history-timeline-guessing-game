"""Compose Google Ads (App campaign) image assets from the same device captures
and visual language as compose_dynamic_screenshots.py, in the three ratios the
campaign accepts: 1.91:1 landscape, 1:1 square and 4:5 portrait.

Usage: python scripts/compose_ads_creative.py <captures_dir> <out_dir>
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parent))
import compose_dynamic_screenshots as base  # noqa: E402

CAPS, OUT = Path(sys.argv[1]), Path(sys.argv[2])
OUT.mkdir(parents=True, exist_ok=True)

# name -> (W, H, phone width, layout). "side" puts the copy left of the phone.
FORMATS = {
    "landscape-1200x628": (1200, 628, 400, "side"),
    "square-1200x1200": (1200, 1200, 600, "stack"),
    "portrait-1200x1500": (1200, 1500, 720, "stack"),
}
SKIP = {"07-dark"}  # a theme slide says little in an ad


def side_text(canvas, head, sub, width):
    """Left-aligned headline + sub, vertically centred, wrapped to `width`."""
    d = ImageDraw.Draw(canvas)
    hf = ImageFont.truetype(base.FONT_BLACK, 84)
    sf = ImageFont.truetype(base.FONT_SEMI, 30)

    def wrap(text, font):
        lines, cur = [], ""
        for wd in text.split():
            trial = (cur + " " + wd).strip()
            if d.textbbox((0, 0), trial, font=font)[2] > width and cur:
                lines.append(cur)
                cur = wd
            else:
                cur = trial
        return lines + [cur]

    rows = [(ln, hf, base.CREAM, 96) for ln in wrap(head, hf)]
    rows += [(ln, sf, base.CREAM_MUTED, 46) for ln in wrap(sub, sf)]
    y = (canvas.height - sum(r[3] for r in rows) - 20) // 2
    for i, (ln, font, fill, step) in enumerate(rows):
        if font is sf and rows[i - 1][1] is hf:
            y += 20
        if font is hf:
            d.text((74, y + 5), ln, font=font, fill=(60, 30, 10, 120))
        d.text((70, y), ln, font=font, fill=fill)
        y += step


def build(slide, fmt):
    W, H, sw, layout = FORMATS[fmt]
    base.W, base.H = W, H
    cap = CAPS / f"{slide['cap']}.png"
    canvas = base.background()

    if layout == "side":
        side_text(canvas, slide["head"], slide["sub"], 560)
        cx, top = 900, 44
    else:
        cx, top = W // 2, base.text_block(canvas, slide["head"], slide["sub"]) + 80

    # Everything around the phone was placed for a 1080-wide canvas with the
    # phone at slide["scale"]; map those positions into this format's phone space.
    k = sw / slide.get("scale", 740)
    ref_top = 390  # phone top in the 1080x1920 originals

    def place(x, y):
        return round(cx + (x - 540) * k), round(top + (y - ref_top) * k)

    flat = base.phone(cap, sw)
    ph = base.tilt_sprite(flat, slide["tilt"])
    px = cx - ph.width // 2 + round((30 if slide["tilt"] < 0 else -30) * k)
    canvas = base.composite(canvas, ph, (px, top - (ph.height - flat.height) // 2), shadow=(48, (0, 56), 190))

    if slide.get("art"):
        x, y, size = slide["art_pos"]
        size = round(size * k)
        card = base.tilt_sprite(base.art_card(slide["art"], size), -slide["tilt"] * 0.8, depth=0.03)
        ax, ay = place(x, y)
        canvas = base.composite(canvas, card, (ax - (card.width - size) // 2, ay - (card.height - size) // 2),
                                shadow=(34, (0, 34), 160))
    if slide.get("owl"):
        owl = base.owl_sprite(round(640 * k))
        ox = cx + sw // 2 - round(owl.width * 0.55) if slide["owl"] == "right" else cx - sw // 2 - round(owl.width * 0.45)
        canvas = base.composite(canvas, owl, (ox, H - owl.height + round(40 * k)), shadow=(30, (0, 24), 150))

    co = slide.get("callout")
    if co:
        raw = Image.open(cap).convert("RGB")
        box = co.get("box") or (base.find_readout(raw) if co.get("auto") == "readout" else None)
        if box:
            # Rotate at 2x and downsample so the card edge stays clean.
            card = base.callout_sprite(raw, box, round(co["width"] * k) * 2).rotate(co["angle"], resample=Image.BICUBIC, expand=True)
            card = card.resize((card.width // 2, card.height // 2), Image.LANCZOS)
            x, y = place(*co["pos"])
            y = min(y, H - card.height // 2 - 30)  # keep it on the shorter canvases
            canvas = base.composite(canvas, card, (x - card.width // 2, y - card.height // 2), shadow=(28, (0, 26), 170))

    out = canvas.convert("RGB")
    dest = OUT / fmt
    dest.mkdir(exist_ok=True)
    out.save(dest / f"{slide['name']}.png", optimize=True)
    print(fmt, slide["name"], out.size)
    return out


for fmt, (W, H, _, _) in FORMATS.items():
    made = [build(s, fmt) for s in base.SLIDES
            if s["name"] not in SKIP and (CAPS / f"{s['cap']}.png").exists()]
    th = 300
    tw = round(W * th / H)
    sheet = Image.new("RGB", ((tw + 10) * len(made), th + 20), (240, 236, 228))
    for i, im in enumerate(made):
        sheet.paste(im.resize((tw, th), Image.LANCZOS), (i * (tw + 10) + 5, 10))
    sheet.save(OUT / f"contact-{fmt}.png")
