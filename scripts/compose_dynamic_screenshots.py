"""Compose the "dynamic" Play screenshot set (1080x1920) for the store-listing
experiment: tilted phone with perspective and a deep shadow bleeding off the
frame, full-bleed copper-to-dark gradient, question art / Minerva bursting past
the phone edge, and an enlarged UI callout.

Usage: python scripts/compose_dynamic_screenshots.py <captures_dir> <out_dir>
<captures_dir> holds raw 1080x2340 device captures named per SLIDES below.
Missing captures are skipped so the set can be built incrementally.
"""
import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
CAPS, OUT = Path(sys.argv[1]), Path(sys.argv[2])
OUT.mkdir(parents=True, exist_ok=True)

W, H = 1080, 1920
STATUS_BAR, NAV_BAR = 94, 156       # cropped from the raw 1080x2340 capture
BEZEL, RADIUS = 26, 96

FONT_BLACK = "C:/Windows/Fonts/seguibl.ttf"
FONT_SEMI = "C:/Windows/Fonts/seguisb.ttf"

CREAM = (250, 245, 238)
CREAM_MUTED = (232, 214, 190)
ACCENT = (232, 134, 43)
COPPER = (176, 112, 58)
DARK = (10, 9, 8)
BEZEL_COL = (24, 19, 15)

# name, capture, headline, sub, options
#  art: question webp shown as a bursting card (path under assets/questions)
#  owl: Minerva position ("right"/"left") or None
#  callout: (raw-capture box (l,t,r,b) at 1080x2340, scale, (cx, cy), angle)
SLIDES = [
    dict(name="01-guess", cap="quiz", head="Guess the year", sub="Slide the timeline. No multiple choice.",
         art="evt-chernobyl.webp", art_pos=(-70, 470, 500), owl=None,
         callout=dict(auto="readout", width=340, pos=(905, 1175), angle=7), tilt=-9, scale=720),
    dict(name="02-reveal", cap="reveal", head="Nail the exact year", sub="Up to 1,000 points a question.",
         art=None, owl="right", callout=dict(box=(780, 1385, 1050, 1520), width=380, pos=(300, 1250), angle=-6),
         tilt=8, scale=740),
    dict(name="03-daily", cap="daily_share", head="Share your daily", sub="Eight questions. One shot. Share your score.",
         art=None, owl=None, callout=dict(box=(330, 635, 750, 830), width=440, pos=(820, 1330), angle=6),
         tilt=-8, scale=740),
    dict(name="04-modes", cap="home", head="Five ways to play", sub="Daily, Endless, Survival, Campaign, Topic of the Day.",
         art=None, owl=None, callout=None, tilt=9, scale=760),
    dict(name="05-museum", cap="museum", head="Build your museum", sub="Guess close and keep the artefact.",
         art="art-beatles-ed-sullivan.webp", art_pos=(640, 470, 420), owl=None, callout=None, tilt=-8, scale=740),
    dict(name="06-campaign", cap="campaign", head="Conquer every era", sub="Six worlds, three stars a stage.",
         art=None, owl="left", callout=None, tilt=8, scale=760),
    dict(name="07-dark", cap="home_dark", head="Easy on the eyes", sub="Warm copper in light and dark.",
         art=None, owl=None, callout=None, tilt=-9, scale=760),
]


# ----------------------------------------------------------------- helpers --
def gradient(size, stops):
    """Vertical multi-stop gradient. stops = [(t, (r,g,b)), ...]"""
    w, h = size
    im = Image.new("RGB", size)
    d = ImageDraw.Draw(im)
    for y in range(h):
        t = y / (h - 1)
        for (t0, c0), (t1, c1) in zip(stops, stops[1:]):
            if t0 <= t <= t1:
                k = (t - t0) / (t1 - t0) if t1 > t0 else 0
                d.line([(0, y), (w, y)], fill=tuple(round(c0[i] + (c1[i] - c0[i]) * k) for i in range(3)))
                break
    return im


def background():
    bg = gradient((W, H), [(0, (214, 142, 74)), (0.42, COPPER), (1, DARK)])
    # Faint brand motif: a big timeline with ticks sweeping across the lower half.
    motif = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(motif)
    ty = 1400
    d.line([(-50, ty), (W + 50, ty)], fill=(255, 235, 205, 38), width=6)
    for i in range(0, 30):
        x = 30 + i * 44
        big = i % 5 == 0
        d.line([(x, ty - (36 if big else 18)), (x, ty)], fill=(255, 235, 205, 38 if big else 24), width=5 if big else 3)
    motif = motif.rotate(-9, resample=Image.BICUBIC, center=(W / 2, ty))
    # Soft light bloom top-left
    bloom = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(bloom).ellipse((-300, -400, 700, 500), fill=(255, 220, 170, 70))
    bloom = bloom.filter(ImageFilter.GaussianBlur(160))
    out = Image.alpha_composite(bg.convert("RGBA"), bloom)
    return Image.alpha_composite(out, motif)


def rounded_mask(size, radius):
    m = Image.new("L", size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=radius, fill=255)
    return m


def perspective_coeffs(src, dst):
    """PIL PERSPECTIVE coefficients mapping dst quad -> src quad."""
    import numpy as np
    a = []
    for (x, y), (u, v) in zip(dst, src):
        a.append([x, y, 1, 0, 0, 0, -u * x, -u * y])
        a.append([0, 0, 0, x, y, 1, -v * x, -v * y])
    A = np.array(a, dtype=float)
    b = np.array([c for pt in src for c in pt], dtype=float)
    return tuple(np.linalg.solve(A, b))


def tilt_sprite(sprite, angle_deg, depth=0.06):
    """Rotate + a little perspective so the far edge recedes; returns RGBA with
    a transparent margin big enough for the rotation."""
    w, h = sprite.size
    pad = int(math.hypot(w, h) * 0.5) - min(w, h) // 2 + 40
    big = Image.new("RGBA", (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    big.paste(sprite, (pad, pad), sprite)
    # Perspective: pinch the top edge inward on the side that tilts away.
    W2, H2 = big.size
    dx = w * depth
    sign = 1 if angle_deg < 0 else -1
    src = [(pad, pad), (pad + w, pad), (pad + w, pad + h), (pad, pad + h)]
    dst = [(pad + (dx if sign > 0 else 0), pad + 12), (pad + w - (dx if sign < 0 else 0), pad + 12),
           (pad + w, pad + h), (pad, pad + h)]
    coeffs = perspective_coeffs(src, dst)
    big = big.transform((W2, H2), Image.PERSPECTIVE, coeffs, Image.BICUBIC)
    return big.rotate(angle_deg, resample=Image.BICUBIC, expand=False)


def phone(capture, sw=740):
    raw = Image.open(capture).convert("RGB")
    screen = raw.crop((0, STATUS_BAR, raw.width, raw.height - NAV_BAR))
    screen = screen.resize((sw, round(screen.height * sw / screen.width)), Image.LANCZOS)
    fw, fh = sw + BEZEL * 2, screen.height + BEZEL * 2
    frame = Image.new("RGBA", (fw, fh), (0, 0, 0, 0))
    body = Image.new("RGBA", (fw, fh), BEZEL_COL + (255,))
    frame.paste(body, (0, 0), rounded_mask((fw, fh), RADIUS + BEZEL))
    # thin highlight rim
    ImageDraw.Draw(frame).rounded_rectangle((1, 1, fw - 2, fh - 2), radius=RADIUS + BEZEL, outline=(90, 70, 50, 255), width=3)
    frame.paste(screen, (BEZEL, BEZEL), rounded_mask(screen.size, RADIUS))
    return frame


def shadow_of(sprite, blur, offset, alpha):
    sh = Image.new("RGBA", sprite.size, (0, 0, 0, 0))
    sil = Image.new("RGBA", sprite.size, (0, 0, 0, alpha))
    sh.paste(sil, (0, 0), sprite)
    sh = sh.filter(ImageFilter.GaussianBlur(blur))
    return sh, offset


def composite(canvas, sprite, pos, shadow=(40, (0, 46), 170)):
    if shadow:
        sh, off = shadow_of(sprite, *shadow)
        layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        layer.paste(sh, (pos[0] + off[0], pos[1] + off[1]), sh)
        canvas = Image.alpha_composite(canvas, layer)
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    layer.paste(sprite, pos, sprite)
    return Image.alpha_composite(canvas, layer)


def art_card(path, size):
    im = Image.open(ROOT / "assets/questions" / path).convert("RGB").resize((size, size), Image.LANCZOS)
    card = Image.new("RGBA", (size + 24, size + 24), (0, 0, 0, 0))
    card.paste(Image.new("RGBA", card.size, CREAM + (255,)), (0, 0), rounded_mask(card.size, 44))
    card.paste(im, (12, 12), rounded_mask(im.size, 34))
    return card


def owl_sprite(height):
    owl = Image.open(ROOT / "assets/mascot/owl.webp").convert("RGBA")
    w = round(owl.width * height / owl.height)
    return owl.resize((w, height), Image.LANCZOS)


def text_block(canvas, head, sub):
    d = ImageDraw.Draw(canvas)
    hf = ImageFont.truetype(FONT_BLACK, 104 if len(head) <= 15 else 92)
    sf = ImageFont.truetype(FONT_SEMI, 42)
    # Headline (wrap at two lines if needed)
    words, lines, cur = head.split(), [], ""
    for wd in words:
        trial = (cur + " " + wd).strip()
        if d.textbbox((0, 0), trial, font=hf)[2] > W - 120 and cur:
            lines.append(cur)
            cur = wd
        else:
            cur = trial
    lines.append(cur)
    y = 110
    for ln in lines:
        bb = d.textbbox((0, 0), ln, font=hf)
        x = (W - (bb[2] - bb[0])) / 2 - bb[0]
        d.text((x + 4, y - bb[1] + 6), ln, font=hf, fill=(60, 30, 10, 120))
        d.text((x, y - bb[1]), ln, font=hf, fill=CREAM)
        y += bb[3] - bb[1] + 14
    bb = d.textbbox((0, 0), sub, font=sf)
    d.text(((W - (bb[2] - bb[0])) / 2 - bb[0], y + 18 - bb[1]), sub, font=sf, fill=CREAM_MUTED)
    return y + 18 + (bb[3] - bb[1])



READOUT_FILL = (249, 237, 224)


def near(a, b, tol=2):
    return all(abs(x - y) <= tol for x, y in zip(a, b))


def find_readout(raw):
    """Locate the orange-bordered year readout box in a raw 1080x2340 quiz
    capture: the longest run of its cream fill down the centre column, then the
    horizontal extent on the run's middle row."""
    px = raw.load()
    best, run, start = (0, 0, 0), 0, 0
    for y in range(900, 2100):
        if near(px[540, y], READOUT_FILL):
            run = run + 1 if run else 1
            start = start if run > 1 else y
            if best[0] < run <= 260:
                best = (run, start, y)
        else:
            run = 0
    n, top, bottom = best
    if n < 80:
        return None
    mid = top + 10  # just under the top border, clear of the year glyphs
    l = r = 540
    while l > 0 and near(px[l - 1, mid], READOUT_FILL):
        l -= 1
    while r < raw.width - 1 and near(px[r + 1, mid], READOUT_FILL):
        r += 1
    return (l - 4, top - 4, r + 5, bottom + 5)


def callout_sprite(raw, box, width):
    crop = raw.crop(box)
    h = round(crop.height * width / crop.width)
    crop = crop.resize((width, h), Image.LANCZOS)
    pad = 14
    card = Image.new("RGBA", (width + pad * 2, h + pad * 2), (0, 0, 0, 0))
    card.paste(Image.new("RGBA", card.size, CREAM + (255,)), (0, 0), rounded_mask(card.size, 30))
    card.paste(crop, (pad, pad), rounded_mask(crop.size, 18))
    ImageDraw.Draw(card).rounded_rectangle((2, 2, card.width - 3, card.height - 3), radius=30, outline=ACCENT + (255,), width=6)
    return card


# ------------------------------------------------------------------ build --
def build(slide):
    cap = CAPS / f"{slide['cap']}.png"
    if not cap.exists():
        print("skip", slide["name"], "(no capture", cap.name + ")")
        return None
    canvas = background()
    text_bottom = text_block(canvas, slide["head"], slide["sub"])

    flat = phone(cap, slide.get("scale", 740))
    ph = tilt_sprite(flat, slide["tilt"])
    # Anchor the phone so its top sits just under the copy; it may bleed off the bottom.
    px = (W - ph.width) // 2 + (30 if slide["tilt"] < 0 else -30)
    py = text_bottom + 90 - (ph.height - flat.height) // 2
    canvas = composite(canvas, ph, (px, py), shadow=(48, (0, 56), 190))

    if slide.get("art"):
        x, y, size = slide["art_pos"]
        card = tilt_sprite(art_card(slide["art"], size), -slide["tilt"] * 0.8, depth=0.03)
        canvas = composite(canvas, card, (x - (card.width - size) // 2, y - (card.height - size) // 2),
                           shadow=(34, (0, 34), 160))
    if slide.get("owl"):
        owl = owl_sprite(640)
        ox = W - owl.width + 90 if slide["owl"] == "right" else -110
        canvas = composite(canvas, owl, (ox, H - owl.height + 40), shadow=(30, (0, 24), 150))

    if slide.get("callout"):
        co = slide["callout"]
        raw = Image.open(cap).convert("RGB")
        box = co.get("box") or (find_readout(raw) if co.get("auto") == "readout" else None)
        if box:
            card = callout_sprite(raw, box, co["width"]).rotate(co["angle"], resample=Image.BICUBIC, expand=True)
            cx, cy = co["pos"]
            canvas = composite(canvas, card, (cx - card.width // 2, cy - card.height // 2), shadow=(28, (0, 26), 170))
        else:
            print("  no callout box found for", slide["name"])

    out = canvas.convert("RGB")
    out.save(OUT / f"{slide['name']}.png", optimize=True)
    print(slide["name"], out.size)
    return out


made = [b for b in (build(s) for s in SLIDES) if b is not None]
if made:
    sheet = Image.new("RGB", (280 * len(made), 500), (240, 236, 228))
    for i, im in enumerate(made):
        sheet.paste(im.resize((270, 480), Image.LANCZOS), (i * 280 + 5, 10))
    sheet.save(OUT / "contact.png")
    print("contact", len(made))
