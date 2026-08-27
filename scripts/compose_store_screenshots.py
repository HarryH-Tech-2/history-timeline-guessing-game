"""Compose Google Play phone screenshots (1080x1920, 24-bit PNG) from raw
1080x2340 device captures: crop system bars, wrap in a phone bezel, add a
caption. Usage: python compose_store.py <shots_dir> <out_dir>"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

SHOTS, OUT = Path(sys.argv[1]), Path(sys.argv[2])
OUT.mkdir(parents=True, exist_ok=True)

W, H = 1080, 1920
STATUS_BAR, NAV_BAR = 94, 156  # px to crop from the raw 1080x2340 capture
SCREEN_W = 780
BEZEL = 22
RADIUS = 88

FONT_BOLD = "C:/Windows/Fonts/segoeuib.ttf"
FONT_REG = "C:/Windows/Fonts/segoeui.ttf"

LIGHT = dict(bg=(250, 245, 238), head=(29, 23, 18), sub=(94, 82, 67), accent=(232, 134, 43), bezel=(29, 23, 18))
DARK = dict(bg=(10, 9, 8), head=(247, 242, 234), sub=(183, 172, 157), accent=(232, 134, 43), bezel=(44, 37, 28))

SHOTS_SPEC = [
    ("01-quiz", "quiz", "When did it happen?", "Slide the timeline to place 150\nmoments in history.", LIGHT),
    ("02-reveal", "reveal", "Nail the exact year", "Up to 1,000 points a question —\nthe closer you are, the more you score.", LIGHT),
    ("03-summary", "summary", "Earn three stars", "Minerva the owl cheers you through\nevery stage you clear.", LIGHT),
    ("04-home", "home", "Five ways to play", "Daily, Endless, Survival, Campaign\nand a fresh Topic of the Day.", LIGHT),
    ("05-museum", "museum", "Build your museum", "Guess close to the real year to add\nan artefact to your collection.", LIGHT),
    ("06-campaign", "campaign", "Work through history", "Five worlds, thirty stages,\nthree stars each.", LIGHT),
    ("07-dark", "home_dark", "Easy on the eyes", "A warm copper look in light\nand dark themes.", DARK),
]


def rounded_mask(size, radius):
    m = Image.new("L", size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=radius, fill=255)
    return m


def draw_text_centered(draw, y, text, font, fill, line_gap=10):
    for line in text.split("\n"):
        bbox = draw.textbbox((0, 0), line, font=font)
        w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
        draw.text(((W - w) / 2 - bbox[0], y - bbox[1]), line, font=font, fill=fill)
        y += h + line_gap
    return y


def compose(name, src, heading, sub, theme):
    raw = Image.open(SHOTS / f"{src}.png").convert("RGB")
    screen = raw.crop((0, STATUS_BAR, raw.width, raw.height - NAV_BAR))
    scale = SCREEN_W / screen.width
    screen = screen.resize((SCREEN_W, round(screen.height * scale)), Image.LANCZOS)

    canvas = Image.new("RGB", (W, H), theme["bg"])
    draw = ImageDraw.Draw(canvas)

    # Caption
    head_font = ImageFont.truetype(FONT_BOLD, 68)
    sub_font = ImageFont.truetype(FONT_REG, 36)
    y = draw_text_centered(draw, 96, heading, head_font, theme["head"])
    y = draw_text_centered(draw, y + 14, sub, sub_font, theme["sub"], line_gap=6)
    # Accent rule under the caption
    draw.rectangle((W / 2 - 40, y + 26, W / 2 + 40, y + 31), fill=theme["accent"])

    # Phone frame with soft shadow
    frame_w, frame_h = SCREEN_W + BEZEL * 2, screen.height + BEZEL * 2
    fx, fy = (W - frame_w) // 2, 330
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((fx, fy + 18, fx + frame_w, fy + frame_h + 18), radius=RADIUS + BEZEL, fill=(0, 0, 0, 90))
    shadow = shadow.filter(ImageFilter.GaussianBlur(28))
    canvas = Image.alpha_composite(canvas.convert("RGBA"), shadow).convert("RGB")

    frame = Image.new("RGB", (frame_w, frame_h), theme["bezel"])
    canvas.paste(frame, (fx, fy), rounded_mask(frame.size, RADIUS + BEZEL))
    canvas.paste(screen, (fx + BEZEL, fy + BEZEL), rounded_mask(screen.size, RADIUS))

    # Anything below the canvas is simply cut (store-style bleed).
    out = OUT / f"{name}.png"
    canvas.save(out, optimize=True)
    print(out.name, canvas.size, canvas.mode)


for spec in SHOTS_SPEC:
    compose(*spec)

# Contact sheet for review
thumbs = [Image.open(OUT / f"{s[0]}.png").resize((270, 480)) for s in SHOTS_SPEC]
sheet = Image.new("RGB", (280 * len(thumbs), 480), "white")
for i, t in enumerate(thumbs):
    sheet.paste(t, (i * 280, 0))
sheet.save(SHOTS / "store_contact.png")
