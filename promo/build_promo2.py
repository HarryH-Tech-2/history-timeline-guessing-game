"""History Date Guesser promo v2: a rapid "guess the year" quiz the viewer plays.

Everything is rendered frame-by-frame with PIL/numpy from the question dioramas
in assets/questions, two CFR gameplay segments from the 2026-09-01 take, the
mascot and the icon, then piped to ffmpeg. Sound design (clock ticks, stamp
hits, sweeps, a soft pad) is synthesized with numpy so the video is
licence-free. Drop a music file at promo/music.mp3 (or .wav/.m4a) to mix a bed.

    python promo/build_promo2.py                 # 16:9 -> promo/history-date-guesser-promo-v2.mp4
    python promo/build_promo2.py --aspect 9:16   # portrait -> promo/history-date-guesser-promo-v2-portrait.mp4
    python promo/build_promo2.py --preview 15    # every 15th frame to a contact sheet, no encode
"""
import argparse
import glob
import math
import os
import subprocess
import sys
import wave

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = "C:/Users/harry/Documents/code/history-date-guessing-game"
PROMO = f"{ROOT}/promo"
ART = f"{ROOT}/assets/questions"
SEGS = os.path.expanduser("~/.claude/jobs/b40c9d50/tmp")  # seg-heartdrag.mp4 / seg-heartreveal.mp4 (CFR)
TMP = f"{PROMO}/tmp2"
FPS = 30
SR = 48000

FONT_DIR = "C:/Windows/Fonts"
SERIF_B, SANS_B, SANS = "palab.ttf", "segoeuib.ttf", "segoeui.ttf"

CREAM = (247, 243, 234)
ORANGE = (232, 137, 30)
COPPER = (196, 128, 62)
MUTED = (201, 191, 175)
INK = (22, 18, 16)
BEZEL = (28, 24, 21)

QUESTIONS = [
    dict(id="evt-vesuvius", title="The Eruption of Mount Vesuvius", sub="Pompeii and Herculaneum are buried",
         year=79, span=2000, tick=100, label=500),
    dict(id="bat-thermopylae", title="The Battle of Thermopylae", sub="The 300 Spartans hold the pass",
         year=-480, span=2000, tick=100, label=500),
    dict(id="bat-hastings", title="The Battle of Hastings", sub="William of Normandy defeats King Harold",
         year=1066, span=1200, tick=50, label=200),
    dict(id="evt-moon-landing", title="The Moon Landing", sub="Apollo 11 lands the first humans on the Moon",
         year=1969, span=600, tick=25, label=100),
]
# (duration, question-text in, sweep start, sweep end) -- each round is quicker than the last
QUIZ_TIMING = [(4.6, 0.4, 1.9, 3.3), (3.8, 0.15, 1.2, 2.4), (3.2, 0.1, 0.9, 1.9), (3.0, 0.1, 0.8, 1.7)]
STATEMENT_DUR = 3.4
DRAG_DUR = 3.0
REVEAL_DUR = 4.2
END_DUR = 5.4

WALL_IDS = ["evt-great-fire-london", "bat-waterloo", "art-mona-lisa", "tec-printing-press", "exp-shackleton",
            "ppl-cleopatra", "evt-berlin-wall", "bat-trafalgar", "art-starry-night", "tec-powered-flight",
            "exp-magellan", "ppl-joan-of-arc", "evt-titanic", "bat-agincourt", "art-sistine-chapel",
            "tec-sputnik", "con-machu-picchu", "ppl-genghis-khan", "evt-french-revolution", "bat-midway",
            "art-globe-theatre", "tec-telescope", "exp-everest", "ppl-curie", "evt-black-death",
            "bat-stalingrad", "art-terracotta-army", "tec-light-bulb", "con-panama-canal", "ppl-napoleon"]


# ---------------------------------------------------------------- helpers
_fonts = {}


def font(name, size):
    k = (name, size)
    if k not in _fonts:
        _fonts[k] = ImageFont.truetype(f"{FONT_DIR}/{name}", size)
    return _fonts[k]


def clamp(u, a=0.0, b=1.0):
    return max(a, min(b, u))


def ease_out(u):
    u = clamp(u)
    return 1 - (1 - u) ** 3


def ease_in_out(u):
    u = clamp(u)
    return u * u * (3 - 2 * u)


def fmt_year(y):
    y = int(round(y))
    if y < 0:
        return f"{-y} BCE"
    if y == 0:
        return "0"
    if y < 1000:
        return f"{y} CE"
    return str(y)


def text_layer(s, fnt, fill, tracking=0, shadow=True):
    """Render one line of text to a tight RGBA layer (optionally letter-spaced)."""
    pad = 12
    if tracking:
        widths = [fnt.getlength(c) for c in s]
        w = int(sum(widths) + tracking * (len(s) - 1))
    else:
        w = int(fnt.getlength(s))
    l, t, r, b = fnt.getbbox("Hgy" + s)
    h = b - t
    layer = Image.new("RGBA", (w + 2 * pad, h + 2 * pad + 6), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)

    def put(dx, dy, col):
        x = pad + dx
        y = pad - t + dy
        if tracking:
            for c, cw in zip(s, widths):
                d.text((x, y), c, font=fnt, fill=col)
                x += cw + tracking
        else:
            d.text((x, y), s, font=fnt, fill=col)

    if shadow:
        put(0, 4, (0, 0, 0, 150))
    put(0, 0, fill)
    return layer


def blit(base, layer, x, y, alpha=1.0, scale=1.0, anchor="lt"):
    """Composite an RGBA layer onto base (RGBA). anchor: [l|c|r][t|m|b] relative to (x, y)."""
    if alpha <= 0:
        return
    if scale != 1.0:
        w, h = layer.size
        layer = layer.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.LANCZOS)
    if alpha < 1.0:
        layer = layer.copy()
        layer.putalpha(layer.getchannel("A").point(lambda v: int(v * alpha)))
    w, h = layer.size
    if anchor[0] == "c":
        x -= w / 2
    elif anchor[0] == "r":
        x -= w
    if anchor[1] == "m":
        y -= h / 2
    elif anchor[1] == "b":
        y -= h
    base.alpha_composite(layer, (int(x), int(y)))


def rounded_mask(size, radius):
    m = Image.new("L", size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius=radius, fill=255)
    return m


def shadow_layer(size, radius, blur=30, alpha=170, grow=10):
    w, h = size
    s = Image.new("RGBA", (w + 4 * blur, h + 4 * blur), (0, 0, 0, 0))
    ImageDraw.Draw(s).rounded_rectangle([2 * blur - grow, 2 * blur - grow + 14, 2 * blur + w + grow, 2 * blur + h + grow + 14],
                                        radius=radius + grow, fill=(0, 0, 0, alpha))
    return s.filter(ImageFilter.GaussianBlur(blur))


def cover(im, size):
    w, h = im.size
    W, H = size
    s = max(W / w, H / h)
    im = im.resize((math.ceil(w * s), math.ceil(h * s)), Image.LANCZOS)
    x = (im.width - W) // 2
    y = (im.height - H) // 2
    return im.crop((x, y, x + W, y + H))


def art(qid):
    return Image.open(f"{ART}/{qid}.webp").convert("RGB")


# ---------------------------------------------------------------- layout
class Layout:
    def __init__(self, aspect):
        self.portrait = aspect == "9:16"
        if self.portrait:
            self.W, self.H = 1080, 1920
            self.card = 820
            self.card_xy = (130, 150)
            self.text_x, self.text_w = 100, 880
            self.kicker_y, self.question_y = 1050, 1105
            self.q_size, self.year_size, self.sub_size = 96, 150, 34
            self.tl_x0, self.tl_x1, self.tl_base, self.tl_box = 80, 1000, 1760, 1650
            self.phone_h = 1080
            self.phone_xy = (300, 120)
            self.phone_text_y = 1330
            self.owl_h = 340
        else:
            self.W, self.H = 1920, 1080
            self.card = 690
            self.card_xy = (150, 80)
            self.text_x, self.text_w = 960, 860
            self.kicker_y, self.question_y = 250, 305
            self.q_size, self.year_size, self.sub_size = 108, 190, 36
            self.tl_x0, self.tl_x1, self.tl_base, self.tl_box = 120, 1800, 985, 880
            self.phone_h = 900
            self.phone_xy = (330, 90)
            self.phone_text_y = 330
            self.owl_h = 330
        self.size = (self.W, self.H)


# ---------------------------------------------------------------- precomputed assets
class Assets:
    def __init__(self, L):
        self.L = L
        W, H = L.size
        rng = np.random.default_rng(7)
        self.grain = rng.integers(-7, 8, (H, W, 1), dtype=np.int16)
        # vignette
        yy, xx = np.mgrid[0:H, 0:W]
        r = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2)
        self.vignette = np.clip(1.0 - 0.55 * np.clip(r - 0.45, 0, 1) ** 1.4, 0, 1)[..., None]
        # plain dark backdrop with a copper glow
        base = np.zeros((H, W, 3), dtype=np.float32) + np.array(INK, dtype=np.float32)
        glow = np.exp(-(((xx - W * 0.42) / (W * 0.45)) ** 2 + ((yy - H * 0.5) / (H * 0.6)) ** 2))[..., None]
        base += glow * np.array((52, 30, 12), dtype=np.float32)
        self.plain = self.finish(base)
        # diorama backdrops
        self.backdrops = {}
        for q in QUESTIONS:
            im = cover(art(q["id"]), (W // 4, H // 4)).filter(ImageFilter.GaussianBlur(22)).resize((W, H), Image.BILINEAR)
            a = np.asarray(im).astype(np.float32)
            a = a * 0.30 + np.array(INK, dtype=np.float32) * 0.25
            self.backdrops[q["id"]] = self.finish(a)
        # diorama cards (pre-upscaled for the push-in)
        big = int(L.card * 1.10)
        self.cards = {}
        for q in QUESTIONS:
            self.cards[q["id"]] = art(q["id"]).resize((big, big), Image.LANCZOS)
        self.card_mask = rounded_mask((L.card, L.card), 34)
        self.card_shadow = shadow_layer((L.card, L.card), 34, blur=34, alpha=190)
        # icon, owl
        ic = Image.open(f"{ROOT}/assets/store/game-icon-512.png").convert("RGBA")
        n = 260 if not L.portrait else 300
        ic = ic.resize((n, n), Image.LANCZOS)
        ic.putalpha(rounded_mask((n, n), int(n * 0.22)))
        self.icon = ic
        owl = Image.open(f"{ROOT}/assets/mascot/owl.webp").convert("RGBA")
        self.owl = owl.resize((round(owl.width * L.owl_h / owl.height), L.owl_h), Image.LANCZOS)
        # phone frames
        self.phone_w = round(1080 * L.phone_h / 2110)
        self.screen_mask = rounded_mask((self.phone_w, L.phone_h), int(self.phone_w * 0.095))
        bw = 16
        self.bezel_pad = bw
        bez = Image.new("RGBA", (self.phone_w + 2 * bw, L.phone_h + 2 * bw), (0, 0, 0, 0))
        ImageDraw.Draw(bez).rounded_rectangle([0, 0, bez.width - 1, bez.height - 1], radius=int(self.phone_w * 0.095) + bw,
                                              fill=BEZEL + (255,), outline=(70, 62, 55, 255), width=2)
        self.bezel = bez
        self.phone_shadow = shadow_layer(bez.size, 60, blur=40, alpha=200, grow=6).rotate(-5, resample=Image.BICUBIC, expand=True)
        self.drag_frames = sorted(glob.glob(f"{TMP}/drag_*.png"))
        self.reveal_frames = sorted(glob.glob(f"{TMP}/reveal_*.png"))
        # diorama wall
        tile, gap = (250, 14) if not L.portrait else (240, 14)
        cols = math.ceil((W + 500) / (tile + gap))
        rows = math.ceil((H + 400) / (tile + gap))
        wall = Image.new("RGB", (cols * (tile + gap), rows * (tile + gap)), INK)
        k = 0
        for r_ in range(rows):
            for c in range(cols):
                qid = WALL_IDS[k % len(WALL_IDS)]
                k += 1
                t = art(qid).resize((tile, tile), Image.LANCZOS)
                wall.paste(t, (c * (tile + gap) + (r_ % 2) * (tile // 2), r_ * (tile + gap)))
        a = np.asarray(wall).astype(np.float32) * 0.36
        self.wall = np.clip(a, 0, 255).astype(np.uint8)
        # soft dark band across the middle so end-card text sits on something quiet
        yy = np.arange(H)[:, None, None]
        c, half = H * 0.5, H * 0.26
        self.band = (1.0 - 0.5 * np.clip(1 - np.abs(yy - c) / half, 0, 1) ** 0.7).astype(np.float32)

    def finish(self, a):
        a = a * self.vignette + self.grain
        return np.clip(a, 0, 255).astype(np.uint8)


# ---------------------------------------------------------------- scene drawing
class Renderer:
    def __init__(self, L, A):
        self.L, self.A = L, A
        self.scenes = []  # (dur, fn)

    # --- backdrops
    def frame_from(self, arr):
        return Image.fromarray(arr).convert("RGBA")

    def crossfade(self, prev, cur, u):
        if u >= 1 or prev is None:
            return cur
        u = ease_in_out(u)
        return (prev.astype(np.float32) * (1 - u) + cur.astype(np.float32) * u).astype(np.uint8)

    # --- shared elements
    def diorama_card(self, fr, qid, t, in_at=0.0):
        L, A = self.L, self.A
        u = ease_out((t - in_at) / 0.5)
        if u <= 0:
            return
        push = 1.0 + 0.07 * clamp(t / 4.0)  # slow push-in
        big = A.cards[qid]
        crop = big.width / push
        cx = big.width / 2
        box = (int(cx - crop / 2), int(cx - crop / 2), int(cx + crop / 2), int(cx + crop / 2))
        card = big.crop(box).resize((L.card, L.card), Image.BILINEAR).convert("RGBA")
        card.putalpha(A.card_mask)
        x, y = L.card_xy
        scale = 0.94 + 0.06 * u
        y += (1 - u) * 30
        blit(fr, A.card_shadow, x + L.card / 2, y + L.card / 2, alpha=u, scale=scale, anchor="cm")
        blit(fr, card, x + L.card / 2, y + L.card / 2, alpha=u, scale=scale, anchor="cm")

    def kicker(self, fr, s, y, t_in, t, x=None, anchor="lt", color=ORANGE):
        L = self.L
        u = ease_out((t - t_in) / 0.35)
        if u <= 0:
            return
        x = L.text_x if x is None else x
        blit(fr, text_layer(s.upper(), font(SANS_B, 28 if not L.portrait else 30), color, tracking=5), x, y + (1 - u) * 12, alpha=u, anchor=anchor)

    def question(self, fr, t, t_in, t_out):
        """'When did / this happen?' in the text column; fades out at t_out."""
        L = self.L
        a = ease_out((t - t_in) / 0.4) * (1 - ease_out((t - (t_out - 0.18)) / 0.18))
        if a <= 0:
            return
        f = font(SERIF_B, L.q_size)
        lines = ["When did", "this happen?"]
        y = L.question_y
        for i, ln in enumerate(lines):
            blit(fr, text_layer(ln, f, CREAM), L.text_x, y + i * (L.q_size * 1.12) + (1 - a) * 20, alpha=a)

    def year_stamp(self, fr, q, t, t_land):
        L = self.L
        u = (t - t_land) / 0.28
        if u <= 0:
            return
        a = ease_out(u * 3)
        scale = 1 + 0.45 * (1 - ease_out(u))
        f = font(SERIF_B, L.year_size)
        blit(fr, text_layer(fmt_year(q["year"]), f, ORANGE), L.text_x - 6, L.question_y - 10, alpha=a, scale=scale)
        # subtitle
        s = ease_out((t - t_land - 0.25) / 0.35)
        if s > 0:
            blit(fr, text_layer(q["sub"], font(SANS, L.sub_size), MUTED), L.text_x, L.question_y + L.year_size * 1.25 + (1 - s) * 10, alpha=s)

    def timeline(self, fr, q, t, sweep, appear_at=None):
        """Copper timeline with a sweeping needle and readout box; the needle lands on the answer."""
        L = self.L
        x0, x1, base = L.tl_x0, L.tl_x1, L.tl_base
        a0, a1 = sweep
        vis = 1.0 if appear_at is None else ease_out((t - appear_at) / 0.45)
        if vis <= 0:
            return
        span = q["span"]
        y_min = q["year"] - 0.68 * span
        y_max = y_min + span

        def xof(year):
            return x0 + (year - y_min) / span * (x1 - x0)

        layer = Image.new("RGBA", (L.W, L.H), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        # base line + ticks
        d.line([(x0, base), (x1, base)], fill=COPPER + (255,), width=3)
        first = math.floor(y_min / q["tick"]) * q["tick"]
        yr = first
        lf = font(SANS, 24 if not L.portrait else 26)
        while yr <= y_max:
            if y_min <= yr <= y_max:
                x = xof(yr)
                major = yr % q["label"] == 0
                h = 26 if major else 12
                d.line([(x, base - h), (x, base)], fill=(COPPER if major else (120, 90, 60)) + (255,), width=3 if major else 2)
                if major:
                    lab = text_layer(fmt_year(yr) if yr < 1000 else str(yr), lf, MUTED, shadow=False)
                    layer.alpha_composite(lab, (int(x - lab.width / 2), base + 12))
            yr += q["tick"]
        # needle position
        u = clamp((t - a0) / (a1 - a0))
        frac = 0.05 + 0.63 * ease_out(u)
        year = y_min + frac * span
        landed = t >= a1
        if landed:
            year = q["year"]
        nx = xof(year)
        d.line([(nx, base - 64), (nx, base)], fill=ORANGE + (255,), width=5)
        d.ellipse([nx - 9, base - 9, nx + 9, base + 9], fill=ORANGE + (255,))
        # readout box
        bw, bh = (170, 74) if not L.portrait else (190, 80)
        by = L.tl_box
        bx = clamp(nx - bw / 2, x0, x1 - bw)
        flash = landed and (t - a1) < 0.22
        fill = ORANGE + (255,) if landed else (250, 240, 225, 255)
        d.rounded_rectangle([bx, by, bx + bw, by + bh], radius=10, fill=fill, outline=ORANGE + (255,), width=3)
        rf = font(SANS_B, 40 if not L.portrait else 44)
        txt = text_layer(fmt_year(year), rf, (CREAM if landed else ORANGE), shadow=False)
        sc = 1.18 if flash else 1.0
        blit(layer, txt, bx + bw / 2, by + bh / 2, scale=sc, anchor="cm")
        # slide-up on appear
        dy = (1 - vis) * 90
        if vis < 1:
            layer.putalpha(layer.getchannel("A").point(lambda v: int(v * vis)))
        fr.alpha_composite(layer, (0, int(dy)))

    def phone(self, fr, frame_path, t, in_at=0.0, x=None, y=None, angle=-5):
        L, A = self.L, self.A
        u = ease_out((t - in_at) / 0.5)
        if u <= 0:
            return
        scr = Image.open(frame_path).convert("RGBA")
        if scr.size != (A.phone_w, L.phone_h):
            scr = scr.resize((A.phone_w, L.phone_h), Image.BILINEAR)
        scr.putalpha(A.screen_mask)
        ph = A.bezel.copy()
        ph.alpha_composite(scr, (A.bezel_pad, A.bezel_pad))
        ph = ph.rotate(angle, resample=Image.BICUBIC, expand=True)
        x = L.phone_xy[0] if x is None else x
        y = L.phone_xy[1] if y is None else y
        y += (1 - u) * 40
        cx, cy = x + ph.width / 2, y + ph.height / 2
        blit(fr, A.phone_shadow, cx, cy + 10, alpha=u, anchor="cm")
        blit(fr, ph, cx, cy, alpha=u, anchor="cm")

    # --- scenes
    def quiz_scene(self, i):
        q = QUESTIONS[i]
        dur, q_in, a0, a1 = QUIZ_TIMING[i]
        prev = self.A.plain if i == 0 else self.A.backdrops[QUESTIONS[i - 1]["id"]]
        cur = self.A.backdrops[q["id"]]

        def fn(t):
            fr = self.frame_from(self.crossfade(prev, cur, t / 0.35))
            self.diorama_card(fr, q["id"], t, in_at=0.0)
            self.kicker(fr, q["title"], self.L.kicker_y, q_in, t)
            self.question(fr, t, q_in, a1)
            self.timeline(fr, q, t, (a0, a1), appear_at=(a0 - 0.6) if i == 0 else None)
            self.year_stamp(fr, q, t, a1)
            if i == 0:
                fade = ease_out(t / 0.25)
                if fade < 1:
                    fr = Image.blend(Image.new("RGBA", fr.size, INK + (255,)), fr, fade)
            return fr

        return dur, fn

    def statement_scene(self):
        L = self.L
        prev = self.A.backdrops[QUESTIONS[-1]["id"]]
        cur = self.A.plain
        f = font(SERIF_B, 118 if not L.portrait else 84)

        def fn(t):
            fr = self.frame_from(self.crossfade(prev, cur, t / 0.3))
            lines = [("You know the moment.", 0.15, 1.65), ("Can you place the year?", 1.75, STATEMENT_DUR + 1)]
            for s, ta, tb in lines:
                a = ease_out((t - ta) / 0.4) * (1 - ease_out((t - tb) / 0.25))
                if a > 0:
                    col = CREAM if ta < 1 else ORANGE
                    blit(fr, text_layer(s, f, col), L.W / 2, L.H / 2 - 20 + (1 - ease_out((t - ta) / 0.6)) * 30, alpha=a, anchor="cm")
            return fr

        return STATEMENT_DUR, fn

    def drag_scene(self):
        L, A = self.L, self.A
        frames = A.drag_frames
        n = len(frames)

        def fn(t):
            fr = self.frame_from(A.plain)
            k = min(n - 1, int(t * FPS))
            self.phone(fr, frames[k], t, in_at=0.0)
            tx = L.text_x if not L.portrait else L.W / 2
            anc = "lt" if not L.portrait else "ct"
            self.kicker(fr, "No multiple choice", L.phone_text_y, 0.3, t, x=tx, anchor=anc)
            f = font(SERIF_B, 92 if not L.portrait else 84)
            for i, (s, ta) in enumerate([("Slide the timeline.", 0.45), ("Trust your gut.", 1.2)]):
                a = ease_out((t - ta) / 0.4)
                if a > 0:
                    blit(fr, text_layer(s, f, CREAM), tx, L.phone_text_y + 60 + i * 112 + (1 - a) * 16, alpha=a, anchor=anc)
            return fr

        return DRAG_DUR, fn

    def reveal_scene(self):
        L, A = self.L, self.A
        frames = A.reveal_frames
        n = len(frames)
        land = 1.05  # the +1000 lands around here in the segment

        def fn(t):
            fr = self.frame_from(A.plain)
            k = min(n - 1, int(t * FPS))
            self.phone(fr, frames[k], t, in_at=-1)
            tx = L.text_x if not L.portrait else L.W / 2
            anc = "lt" if not L.portrait else "ct"
            self.kicker(fr, "Perfect", L.phone_text_y, land, t, x=tx, anchor=anc)
            u = (t - land) / 0.3
            if u > 0:
                sc = 1 + 0.5 * (1 - ease_out(u))
                big = font(SERIF_B, 200 if not L.portrait else 170)
                blit(fr, text_layer("+1,000", big, ORANGE), tx if anc == "lt" else tx, L.phone_text_y + 50, alpha=ease_out(u * 3), scale=sc, anchor=anc)
            a = ease_out((t - land - 0.5) / 0.4)
            if a > 0:
                f = font(SERIF_B, 72 if not L.portrait else 64)
                blit(fr, text_layer("Nail the exact year.", f, CREAM), tx, L.phone_text_y + (300 if not L.portrait else 260) + (1 - a) * 14, alpha=a, anchor=anc)
            o = ease_out((t - land - 0.2) / 0.45)
            if o > 0:
                owl = A.owl
                if L.portrait:  # peeks in from the corner, clear of the caption
                    ox, oy = L.W - owl.width * 0.78, L.H - owl.height * 0.82
                else:
                    ox, oy = L.W - owl.width - 40, L.H - owl.height - 20
                blit(fr, owl, ox, oy + (1 - o) * 80, alpha=o)
            return fr

        return REVEAL_DUR, fn

    def end_scene(self):
        L, A = self.L, self.A
        wall = A.wall
        prev = A.plain

        def fn(t):
            ox = int(24 * t)
            oy = int(12 * t)
            w = wall[oy:oy + L.H, ox:ox + L.W]
            w = (w.astype(np.float32) * A.vignette * A.band).astype(np.uint8)
            fr = self.frame_from(self.crossfade(prev, w, t / 0.4))
            f = font(SERIF_B, 96 if not L.portrait else 80)
            copy = [("200 moments. 8 categories.", 0.3, 2.5), ("A new Daily every day.", 1.1, 2.5)]
            for i, (s, ta, tb) in enumerate(copy):
                a = ease_out((t - ta) / 0.4) * (1 - ease_out((t - tb) / 0.3))
                if a > 0:
                    blit(fr, text_layer(s, f, CREAM), L.W / 2, L.H / 2 - 70 + i * 120, alpha=a, anchor="cm")
            u = ease_out((t - 2.7) / 0.5)
            if u > 0:
                if L.portrait:
                    blit(fr, A.icon, L.W / 2, L.H / 2 - 260, alpha=u, anchor="cm")
                    blit(fr, text_layer("History Date Guesser", font(SERIF_B, 88), CREAM), L.W / 2, L.H / 2 - 40, alpha=u, anchor="cm")
                    blit(fr, text_layer("2,500 years of history. One timeline.", font(SANS, 40), MUTED), L.W / 2, L.H / 2 + 60, alpha=u, anchor="cm")
                    blit(fr, text_layer("Free on Google Play", font(SANS_B, 52), ORANGE), L.W / 2, L.H / 2 + 160, alpha=u, anchor="cm")
                    blit(fr, A.owl, L.W - A.owl.width - 40, L.H - A.owl.height - 60 + (1 - u) * 60, alpha=u)
                else:
                    x = 260
                    blit(fr, A.icon, x, L.H / 2, alpha=u, anchor="lm")
                    blit(fr, text_layer("History Date Guesser", font(SERIF_B, 96), CREAM), x + 320, L.H / 2 - 120, alpha=u)
                    blit(fr, text_layer("2,500 years of history. One timeline.", font(SANS, 42), MUTED), x + 320, L.H / 2 + 10, alpha=u)
                    blit(fr, text_layer("Free on Google Play", font(SANS_B, 54), ORANGE), x + 320, L.H / 2 + 90, alpha=u)
                    blit(fr, A.owl, L.W - A.owl.width - 70, L.H - A.owl.height - 20 + (1 - u) * 60, alpha=u)
            out = 1 - ease_out((t - (END_DUR - 0.7)) / 0.7)
            if out < 1:
                fr = Image.blend(Image.new("RGBA", fr.size, INK + (255,)), fr, out)
            return fr

        return END_DUR, fn

    def build(self):
        self.scenes = [self.quiz_scene(i) for i in range(4)]
        self.scenes += [self.statement_scene(), self.drag_scene(), self.reveal_scene(), self.end_scene()]
        self.total = sum(d for d, _ in self.scenes)
        return self.total

    def frame(self, t):
        acc = 0.0
        for dur, fn in self.scenes:
            if t < acc + dur or (dur, fn) is self.scenes[-1]:
                return fn(t - acc)
            acc += dur


# ---------------------------------------------------------------- audio
def scene_starts():
    starts, acc = [], 0.0
    for d in [x[0] for x in QUIZ_TIMING] + [STATEMENT_DUR, DRAG_DUR, REVEAL_DUR, END_DUR]:
        starts.append(acc)
        acc += d
    return starts, acc


def events():
    """(time, kind) list: tick / stamp / sweep / ding, mirroring the render timing."""
    ev = []
    starts, _ = scene_starts()
    for i, q in enumerate(QUESTIONS):
        s = starts[i]
        _, q_in, a0, a1 = QUIZ_TIMING[i]
        ev.append((s + a0, "sweep", a1 - a0))
        step = q["tick"] / 2
        span = q["span"]
        y_min = q["year"] - 0.68 * span
        last = None
        n = int((a1 - a0) * 240)
        for k in range(n + 1):
            u = k / n
            year = y_min + (0.05 + 0.63 * ease_out(u)) * span
            m = math.floor(year / step)
            if last is not None and m != last:
                ev.append((s + a0 + u * (a1 - a0), "tick", 0))
            last = m
        ev.append((s + a1, "stamp", 0))
        ev.append((s + 0.05, "whoosh", 0))
    st = starts[4]
    # statement: slowing ticks that stop, then a stamp on the question
    tt, gap = st + 0.1, 0.12
    while tt < st + 1.55:
        ev.append((tt, "tick", 0))
        gap *= 1.18
        tt += gap
    ev.append((st + 1.75, "stamp", 0))
    ev.append((starts[5] + 0.1, "whoosh", 0))
    ev.append((starts[6] + 1.05, "ding", 0))
    ev.append((starts[6] + 1.05, "stamp", 0))
    ev.append((starts[7] + 0.1, "whoosh", 0))
    ev.append((starts[7] + 2.7, "ding", 0))
    return ev


def decode_music(path, offset, total):
    """Decode a music file to float32 stereo at SR, starting at `offset` seconds."""
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{offset:.3f}", "-i", path, "-t", f"{total + 1:.3f}",
                          "-f", "s16le", "-ac", "2", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    a = np.frombuffer(raw, dtype="<i2").astype(np.float32).reshape(-1, 2) / 32768
    if len(a) < int(total * SR):
        a = np.concatenate([a, np.zeros((int(total * SR) - len(a), 2), dtype=np.float32)])
    return a


def duck_envelope(n, total):
    """Gain curve for the music: dips under every stamp/ding so the sound design punches through."""
    env = np.ones(n, dtype=np.float32)
    for t0, kind, _ in events():
        if kind not in ("stamp", "ding"):
            continue
        i = int(t0 * SR)
        att, hold, rel = int(0.02 * SR), int(0.12 * SR), int(0.4 * SR)
        depth = 0.5
        seg = np.concatenate([np.linspace(1, depth, att), np.full(hold, depth), np.linspace(depth, 1, rel)]).astype(np.float32)
        j = min(n, i + len(seg))
        if i < n:
            env[i:j] = np.minimum(env[i:j], seg[: j - i])
    t = np.arange(n) / SR
    env *= np.minimum(t / 0.8, 1) * np.clip((total - t) / 2.2, 0, 1)
    return env


def synth_audio(total, out_wav, music=None, music_offset=0.0, music_gain=0.45):
    n = int(total * SR) + SR
    mix = np.zeros(n, dtype=np.float32)
    rng = np.random.default_rng(3)

    def add(t0, sig, gain=1.0):
        i = int(t0 * SR)
        j = min(n, i + len(sig))
        if i < n:
            mix[i:j] += sig[: j - i] * gain

    def env(length, attack, decay):
        t = np.arange(length) / SR
        return np.minimum(t / max(attack, 1e-4), 1.0) * np.exp(-t / decay)

    def tick():
        L_ = int(0.035 * SR)
        t = np.arange(L_) / SR
        click = rng.normal(0, 1, L_) * env(L_, 0.0005, 0.004)
        body = np.sin(2 * np.pi * 1900 * t) * env(L_, 0.0005, 0.010)
        return (click * 0.5 + body * 0.9).astype(np.float32)

    def stamp():
        L_ = int(0.5 * SR)
        t = np.arange(L_) / SR
        f = 90 * np.exp(-t * 9) + 48
        thump = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(L_, 0.002, 0.16)
        snap = rng.normal(0, 1, L_) * env(L_, 0.0005, 0.02)
        return (thump * 1.0 + snap * 0.35).astype(np.float32)

    def whoosh(dur=0.7):
        L_ = int(dur * SR)
        noise = rng.normal(0, 1, L_)
        k = np.ones(24) / 24
        noise = np.convolve(noise, k, mode="same")
        t = np.arange(L_) / SR
        e = np.sin(np.pi * t / dur) ** 2
        return (noise * e).astype(np.float32)

    def sweep(dur):
        L_ = int(dur * SR)
        noise = np.convolve(rng.normal(0, 1, L_), np.ones(40) / 40, mode="same")
        t = np.arange(L_) / SR
        e = (t / dur) ** 0.6 * (1 - t / dur) ** 0.25
        return (noise * e).astype(np.float32)

    def ding():
        L_ = int(1.4 * SR)
        t = np.arange(L_) / SR
        s = (np.sin(2 * np.pi * 1318.5 * t) * np.exp(-t * 3.2) + 0.5 * np.sin(2 * np.pi * 2637 * t) * np.exp(-t * 5)
             + 0.35 * np.sin(2 * np.pi * 1975 * t) * np.exp(-t * 4))
        return (s * np.minimum(t / 0.004, 1)).astype(np.float32)

    for t0, kind, arg in events():
        if kind == "tick":
            add(t0, tick(), 0.55)
        elif kind == "stamp":
            add(t0, stamp(), 0.9)
        elif kind == "whoosh":
            add(t0, whoosh(), 0.16)
        elif kind == "sweep":
            add(t0, sweep(arg), 0.12)
        elif kind == "ding":
            add(t0, ding(), 0.45)

    # pad: slow, warm chord (A2 E3 A3 C#4), low-passed, breathing
    t = np.arange(n) / SR
    pad = np.zeros(n, dtype=np.float32)
    for f, g in [(110, 0.9), (164.8, 0.55), (220, 0.45), (277.2, 0.28), (110.4, 0.5)]:
        pad += g * np.sin(2 * np.pi * f * t + rng.uniform(0, 6.28)).astype(np.float32)
    pad *= (0.7 + 0.3 * np.sin(2 * np.pi * 0.11 * t)).astype(np.float32)
    # one-pole low-pass
    a = math.exp(-2 * math.pi * 320 / SR)
    y = np.zeros_like(pad)
    acc = 0.0
    for i in range(0, n, 4096):
        chunk = pad[i:i + 4096]
        out = np.empty_like(chunk)
        for j in range(len(chunk)):
            acc = a * acc + (1 - a) * chunk[j]
            out[j] = acc
        y[i:i + 4096] = out
    pad = y / (np.max(np.abs(y)) + 1e-6)
    fade = np.minimum(t / 1.5, 1) * np.minimum(np.maximum((total - t) / 1.5, 0), 1)
    mix += pad * (0.04 if music else 0.11) * fade
    mix = mix[: int(total * SR)]
    st = np.stack([mix, mix], axis=1)
    if music:
        m = decode_music(music, music_offset, total)[: len(st)]
        m = m / (np.max(np.abs(m)) + 1e-6)
        st = st + m * music_gain * duck_envelope(len(st), total)[:, None]
    st = np.tanh(st * 1.3) / 1.3
    pcm = np.clip(st * 32767, -32768, 32767).astype("<i2")
    with wave.open(out_wav, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


# ---------------------------------------------------------------- pipeline
def prepare_phone_frames(L):
    os.makedirs(TMP, exist_ok=True)
    phone_w = round(1080 * L.phone_h / 2110)
    for name, src, dur in [("drag", "seg-heartdrag.mp4", DRAG_DUR), ("reveal", "seg-heartreveal.mp4", REVEAL_DUR)]:
        if glob.glob(f"{TMP}/{name}_*.png") and os.path.exists(f"{TMP}/{name}.{L.phone_h}"):
            continue
        for f in glob.glob(f"{TMP}/{name}_*.png"):
            os.remove(f)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", f"{SEGS}/{src}", "-t", str(dur),
                        "-vf", f"crop=1080:2110:0:95,scale={phone_w}:{L.phone_h},fps={FPS}",
                        f"{TMP}/{name}_%03d.png"], check=True)
        open(f"{TMP}/{name}.{L.phone_h}", "w").close()


def music_file():
    for ext in ("mp3", "wav", "m4a", "ogg"):
        p = f"{PROMO}/music.{ext}"
        if os.path.exists(p):
            return p
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--aspect", default="16:9", choices=["16:9", "9:16"])
    ap.add_argument("--out")
    ap.add_argument("--preview", type=int, default=0, help="render every Nth frame to a contact sheet only")
    ap.add_argument("--music", help="music bed (default: promo/music.mp3|wav|m4a|ogg if present)")
    ap.add_argument("--music-offset", type=float, default=0.0, help="seconds into the track to start")
    ap.add_argument("--music-gain", type=float, default=0.6)
    ap.add_argument("--audio-only", action="store_true", help="write the mixed WAV only (fast check)")
    args = ap.parse_args()

    L = Layout(args.aspect)
    prepare_phone_frames(L)
    A = Assets(L)
    R = Renderer(L, A)
    total = R.build()
    nframes = int(total * FPS)
    print(f"{args.aspect}: {total:.1f}s, {nframes} frames")

    if args.preview:
        idx = list(range(0, nframes, args.preview))
        cols = 6 if not L.portrait else 8
        tw = 320
        th = round(L.H * tw / L.W)
        rows = math.ceil(len(idx) / cols)
        sheet = Image.new("RGB", (cols * tw, rows * th), (0, 0, 0))
        for k, i in enumerate(idx):
            fr = R.frame(i / FPS).convert("RGB").resize((tw, th), Image.BILINEAR)
            ImageDraw.Draw(fr).text((6, 4), f"{i / FPS:.1f}s", fill=(255, 0, 255), font=font(SANS_B, 18))
            sheet.paste(fr, ((k % cols) * tw, (k // cols) * th))
        out = args.out or f"{TMP}/preview-{args.aspect.replace(':', 'x')}.png"
        sheet.save(out)
        print("preview:", out)
        return

    wav = f"{TMP}/audio-{args.aspect.replace(':', 'x')}.wav"
    music = args.music or music_file()
    synth_audio(total, wav, music, args.music_offset, args.music_gain)
    print("audio:", wav, "music:", music or "none")
    if args.audio_only:
        return
    out = args.out or (f"{PROMO}/history-date-guesser-promo-v2.mp4" if not L.portrait
                       else f"{PROMO}/history-date-guesser-promo-v2-portrait.mp4")
    cmd = ["ffmpeg", "-v", "error", "-y",
           "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{L.W}x{L.H}", "-r", str(FPS), "-i", "-",
           "-i", wav, "-map", "0:v", "-map", "1:a",
           "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
           "-c:a", "aac", "-b:a", "192k", "-shortest", out]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for i in range(nframes):
        p.stdin.write(R.frame(i / FPS).convert("RGB").tobytes())
        if i % 150 == 0:
            print(f"  frame {i}/{nframes}", flush=True)
    p.stdin.close()
    p.wait()
    if p.returncode:
        sys.exit(p.returncode)
    print("done:", out, f"({total:.1f}s)", "music:" + (music or "none"))


if __name__ == "__main__":
    main()
