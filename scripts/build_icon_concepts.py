"""Build the four Play icon-experiment concepts (512px store icon + adaptive
foreground/background layers) from magenta-backdrop Higgsfield renders.

Usage: python scripts/build_icon_concepts.py <renders_dir> <out_dir>
<renders_dir> holds knob.png, owl.png, glass.png (1:1, magenta #FF00FF bg).
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

RENDERS, OUT = Path(sys.argv[1]), Path(sys.argv[2])
OUT.mkdir(parents=True, exist_ok=True)

S = 512
COPPER = (176, 112, 58)      # app.json adaptive bg #B0703A
COPPER_DEEP = (128, 74, 34)
ACCENT = (232, 134, 43)      # tokens accent
CREAM = (250, 245, 238)      # bg.base
INK = (29, 23, 18)
FONT_BOLD = "C:/Windows/Fonts/segoeuib.ttf"


def chroma_key(im, thresh=0.35):
    """Magenta-ness = (min(r,b) - g)/255; alpha = 1 - m/thresh; despill fringe."""
    im = im.convert("RGBA")
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            m = (min(r, b) - g) / 255
            if m <= 0:
                continue
            alpha = max(0.0, 1 - m / thresh)
            if alpha < 1:
                # despill: pull the fringe towards neutral grey
                grey = (r + g + b) // 3
                t = 1 - alpha
                r = round(r + (grey - r) * t)
                b = round(b + (grey - b) * t)
            px[x, y] = (r, g, b, round(a * alpha))
    return im.crop(im.getbbox())


def gradient(size, top, bottom):
    w, h = size
    im = Image.new("RGB", size)
    d = ImageDraw.Draw(im)
    for y in range(h):
        t = y / (h - 1)
        d.line([(0, y), (w, y)], fill=tuple(round(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
    return im


def rounded(im, radius):
    m = Image.new("L", im.size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, im.width - 1, im.height - 1), radius=radius, fill=255)
    out = Image.new("RGBA", im.size, (0, 0, 0, 0))
    out.paste(im, (0, 0), m)
    return out


def vignette(bg, strength=70):
    """Soft radial darkening at the corners so the centre pops."""
    mask = Image.new("L", bg.size, 0)
    ImageDraw.Draw(mask).ellipse((-S * 0.15, -S * 0.15, S * 1.15, S * 1.15), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(90))
    dark = Image.new("RGB", bg.size, COPPER_DEEP)
    return Image.composite(bg, dark, mask.point(lambda v: 255 - (255 - v) * strength // 100))


def fit(sprite, box_w, box_h):
    scale = min(box_w / sprite.width, box_h / sprite.height)
    return sprite.resize((round(sprite.width * scale), round(sprite.height * scale)), Image.LANCZOS)


def drop_shadow(canvas, sprite, pos, blur=14, offset=(0, 10), alpha=110):
    sh = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    sil = Image.new("RGBA", sprite.size, (0, 0, 0, alpha))
    sh.paste(sil, (pos[0] + offset[0], pos[1] + offset[1]), sprite)
    sh = sh.filter(ImageFilter.GaussianBlur(blur))
    return Image.alpha_composite(canvas, sh)


def place(bg, sprite, cx, cy):
    canvas = bg.convert("RGBA")
    pos = (round(cx - sprite.width / 2), round(cy - sprite.height / 2))
    canvas = drop_shadow(canvas, sprite, pos)
    canvas.paste(sprite, pos, sprite)
    return canvas


def save_set(name, canvas_rgba, fg_rgba, bg_rgb):
    """Store icon (512 RGB, rounded preview too) + adaptive layers (512 each;
    the adaptive foreground is the sprite scaled into the 66% safe circle)."""
    store = canvas_rgba.convert("RGB")
    store.save(OUT / f"{name}-512.png")
    rounded(store, 106).save(OUT / f"{name}-preview.png")
    bg_rgb.save(OUT / f"{name}-adaptive-bg.png")
    fg_rgba.save(OUT / f"{name}-adaptive-fg.png")
    print(name)


def adaptive_fg(sprite, fill=0.60):
    """Sprite centred in a 512 transparent layer, sized to the safe zone."""
    layer = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    sp = fit(sprite, S * fill, S * fill)
    layer.paste(sp, (round((S - sp.width) / 2), round((S - sp.height) / 2)), sp)
    return layer


def copper_bg():
    return vignette(gradient((S, S), (200, 132, 70), COPPER))


# ------------------------------------------------------------- 1 timeline --
def concept_timeline():
    """Pure vector: the app's slider needle + readout dot on a cream track."""
    bg = copper_bg()
    layer = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    ty = 330  # track centre
    d.rectangle((0, ty - 62, S, ty + 62), fill=CREAM)
    for i in range(0, 12):
        x = 22 + i * 44
        big = i % 5 == 0
        d.line([(x, ty - (44 if big else 26)), (x, ty + 62)], fill=(120, 95, 70), width=8 if big else 5)
    # Needle down from the top into the track, ending in the marker dot
    nx = S // 2 + 22
    d.rounded_rectangle((nx - 11, 70, nx + 11, ty + 8), radius=11, fill=ACCENT)
    d.ellipse((nx - 58, ty - 58, nx + 58, ty + 58), fill=CREAM)
    d.ellipse((nx - 46, ty - 46, nx + 46, ty + 46), fill=ACCENT)
    d.ellipse((nx - 20, ty - 30, nx + 4, ty - 6), fill=(255, 214, 160))  # highlight
    canvas = bg.convert("RGBA")
    canvas = drop_shadow(canvas, layer, (0, 0), blur=12, offset=(0, 10), alpha=120)
    canvas.paste(layer, (0, 0), layer)
    fg = adaptive_fg(layer.crop((0, 60, S, ty + 70)), 0.70)
    save_set("icon-a-timeline", canvas, fg, bg)


# --------------------------------------------------------------- 2 owl -----
def concept_owl():
    bg = copper_bg()
    owl = chroma_key(Image.open(RENDERS / "owl.png"))
    sprite = fit(owl, S * 1.02, S * 1.02)
    canvas = place(bg, sprite, S / 2, S / 2 + 12)
    fg = adaptive_fg(sprite, 0.74)
    save_set("icon-b-minerva", canvas, fg, bg)


# --------------------------------------------------------- 3 hidden year ---
def concept_year():
    bg = copper_bg()
    layer = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    font = ImageFont.truetype(FONT_BOLD, 250)
    text = "1?85"
    # Tight kerning: draw glyph by glyph
    widths = [d.textbbox((0, 0), ch, font=font)[2] for ch in text]
    gap = -6
    total = sum(widths) + gap * (len(text) - 1)
    x = (S - total) / 2
    bbox = d.textbbox((0, 0), "1985", font=font)
    y = (S - (bbox[3] - bbox[1])) / 2 - bbox[1]
    for ch, w in zip(text, widths):
        d.text((x, y), ch, font=font, fill=ACCENT if ch == "?" else CREAM)
        x += w + gap
    # A thin timeline rule with a marker under the year
    d.rounded_rectangle((70, 400, 442, 408), radius=4, fill=(250, 245, 238, 150))
    d.ellipse((240, 386, 272, 418), fill=ACCENT)
    canvas = bg.convert("RGBA")
    canvas = drop_shadow(canvas, layer, (0, 0), blur=10, offset=(0, 8), alpha=120)
    canvas.paste(layer, (0, 0), layer)
    fg = adaptive_fg(layer.crop(layer.getbbox()), 0.66)
    save_set("icon-c-hidden-year", canvas, fg, bg)


# ------------------------------------------------- 4 simplified current ----
def concept_glass():
    # Keep the current icon's band identity (cream band across copper).
    bg = gradient((S, S), (235, 128, 58), (218, 106, 40))
    d = ImageDraw.Draw(bg)
    d.rectangle((0, 150, S, 362), fill=CREAM)
    glass = chroma_key(Image.open(RENDERS / "glass.png"))
    sprite = fit(glass, S * 0.86, S * 0.86)
    canvas = place(bg, sprite, S / 2, S / 2)
    fg = adaptive_fg(sprite, 0.70)
    save_set("icon-d-glass", canvas, fg, bg)


for fn in (concept_timeline, concept_owl, concept_year, concept_glass):
    try:
        fn()
    except FileNotFoundError as e:
        print("skip", fn.__name__, e)

# Contact sheet at 48px and 192px next to the current icon
cur = Image.open(Path(__file__).resolve().parents[1] / "assets/store/game-icon-512.png").convert("RGB")
names = ["current"] + [p.stem.replace("-512", "") for p in sorted(OUT.glob("icon-*-512.png"))]
icons = [cur] + [Image.open(p).convert("RGB") for p in sorted(OUT.glob("icon-*-512.png"))]
sheet = Image.new("RGB", (len(icons) * 220, 300), (240, 236, 228))
for i, ic in enumerate(icons):
    sheet.paste(rounded(ic.resize((192, 192), Image.LANCZOS), 40).convert("RGB"), (i * 220 + 14, 20), rounded(ic.resize((192, 192)), 40))
    sheet.paste(rounded(ic.resize((48, 48), Image.LANCZOS), 10).convert("RGB"), (i * 220 + 86, 232), rounded(ic.resize((48, 48)), 10))
sheet.save(OUT / "icons-contact.png")
print("contact", names)
