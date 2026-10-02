"""Compose Google Ads (App campaign) image assets from the same device captures
and visual language as compose_dynamic_screenshots.py, in the three ratios the
campaign accepts: 1.91:1 landscape, 1:1 square and 4:5 portrait.

Usage: python scripts/compose_ads_creative.py [play_locale ...]   # default: every listing

Per locale it reads the store captures (assets/store/listing/captures/<locale>/)
and the screenshot copy from the listing JSON, and writes
assets/store/ads-creative/<locale>/<format>/<slide>.png plus a contact sheet per format.
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent))
import compose_dynamic_screenshots as base  # noqa: E402
import locale_text as lt  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
LOCALES = ["en-US", "pt-BR", "es-419", "ja-JP"]

# name -> (W, H, phone width, layout). "side" puts the copy left of the phone.
FORMATS = {
    "landscape-1200x628": (1200, 628, 400, "side"),
    "square-1200x1200": (1200, 1200, 600, "stack"),
    "portrait-1200x1500": (1200, 1500, 720, "stack"),
}
SKIP = {"08-dark"}  # a theme slide says little in an ad


def side_text(canvas, head, sub, width, lang):
    """Left-aligned headline + sub, vertically centred, wrapped to `width`."""
    d = ImageDraw.Draw(canvas)
    f = lt.fonts(lang)
    # Japanese has no spaces to break on, so a short headline would split
    # mid-word; keep it on one line, shrinking if it has to.
    hf, hlines = lt.fit_lines(head, f["black"], width, lang, 84, 48, max_lines=3,
                              one_line_min=56 if lt.is_cjk(lang) else None)
    sf, slines = lt.fit_lines(sub, f["semi"], width, lang, 30, 22, max_lines=3)
    ref = "国g" if lt.is_cjk(lang) else "Hg"
    rows = []
    for fnt, lines, fill, gap in ((hf, hlines, base.CREAM, 0.14), (sf, slines, base.CREAM_MUTED, 0.3)):
        rt, rb = d.textbbox((0, 0), ref, font=fnt)[1::2]
        rows += [(ln, fnt, fill, rt, (rb - rt) + round(fnt.size * gap)) for ln in lines]
    y = (canvas.height - sum(r[4] for r in rows) - 20) // 2
    for i, (ln, fnt, fill, rt, step) in enumerate(rows):
        if fnt is sf and rows[i - 1][1] is hf:
            y += 20
        if fnt is hf:
            d.text((74, y - rt + 5), ln, font=fnt, fill=(60, 30, 10, 120))
        d.text((70, y - rt), ln, font=fnt, fill=fill)
        y += step


def build(slide, fmt, caps, out_dir, lang):
    W, H, sw, layout = FORMATS[fmt]
    base.W, base.H = W, H
    cap = caps / f"{slide['cap']}.png"
    canvas = base.background()

    if layout == "side":
        side_text(canvas, slide["head"], slide["sub"], 560, lang)
        cx, top = 900, 44
    else:
        cx, top = W // 2, base.text_block_localized(canvas, slide["head"], slide["sub"], lang) + 80

    # Everything around the phone was placed for a 1080-wide canvas with the
    # phone at slide["scale"]; map those positions into this format's phone space.
    k = sw / slide.get("scale", 740)
    ref_top = 390  # phone top in the 1080x1920 originals

    def place(x, y):
        return round(cx + (x - 540) * k), round(top + (y - ref_top) * k)

    # The owl needs the side strip the screenshot layout clears for her; the
    # landscape format has no such strip (copy on the left, phone on the right).
    owl = slide.get("owl") if layout == "stack" else None
    if owl:
        cx += round(slide.get("shift", 0) * k)

    flat = base.phone(cap, sw)
    ph = base.tilt_sprite(flat, slide["tilt"])
    px = cx - ph.width // 2 + round((30 if slide["tilt"] < 0 else -30) * k)
    canvas = base.composite(canvas, ph, (px, top - (ph.height - flat.height) // 2), shadow=(48, (0, 56), 190))

    if slide.get("art"):
        x, y, size = slide["art_pos"]
        size = round(size * k)
        card = base.tilt_sprite(base.art_card(slide["art"], size), -slide["tilt"] * 0.8, depth=0.03)
        ax, ay = place(x, y)
        ax = min(ax, W - card.width // 2 - 10)  # keep the card on the canvas
        canvas = base.composite(canvas, card, (ax - (card.width - size) // 2, ay - (card.height - size) // 2),
                                shadow=(34, (0, 34), 160))
    if owl:
        sprite = base.owl_sprite(round(slide.get("owl_h", 640) * k))
        bleed = 90 * sprite.height // 640
        ox = W - sprite.width + bleed if owl == "right" else -bleed - 20
        canvas = base.composite(canvas, sprite, (ox, H - sprite.height + round(40 * k)), shadow=(30, (0, 24), 150))

    co = slide.get("callout")
    if co:
        raw = Image.open(cap).convert("RGB")
        box = co.get("box") or (base.find_readout(raw) if co.get("auto") == "readout" else None)
        if box:
            # Rotate at 2x and downsample so the card edge stays clean.
            card = base.callout_sprite(raw, box, round(co["width"] * k) * 2).rotate(co["angle"], resample=Image.BICUBIC, expand=True)
            card = card.resize((card.width // 2, card.height // 2), Image.LANCZOS)
            x, y = place(*co["pos"])
            x = min(x, W - card.width // 2 - 20)
            y = min(y, H - card.height // 2 - 30)  # keep it on the shorter canvases
            canvas = base.composite(canvas, card, (x - card.width // 2, y - card.height // 2), shadow=(28, (0, 26), 170))

    out = canvas.convert("RGB")
    dest = out_dir / fmt
    dest.mkdir(parents=True, exist_ok=True)
    out.save(dest / f"{slide['name']}.png", optimize=True)
    return out


def build_locale(play_locale):
    listing = lt.load_listing(play_locale)
    lang = listing["app_locale"]
    caps = ROOT / "assets/store/listing/captures" / play_locale
    out_dir = ROOT / "assets/store/ads-creative" / play_locale
    slides = [s for s in base.localized_slides(listing)
              if s["name"] not in SKIP and (caps / f"{s['cap']}.png").exists()]
    for fmt, (W, H, _, _) in FORMATS.items():
        made = [build(s, fmt, caps, out_dir, lang) for s in slides]
        th = 300
        tw = round(W * th / H)
        sheet = Image.new("RGB", ((tw + 10) * len(made), th + 20), (240, 236, 228))
        for i, im in enumerate(made):
            sheet.paste(im.resize((tw, th), Image.LANCZOS), (i * (tw + 10) + 5, 10))
        sheet.save(out_dir / f"contact-{fmt}.png")
        print(play_locale, fmt, len(made))


if __name__ == "__main__":
    for loc in sys.argv[1:] or LOCALES:
        build_locale(loc)
