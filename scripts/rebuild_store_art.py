import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = r"C:\Users\harry\Documents\code\history-date-guessing-game"
ORIG = os.path.join(os.environ["TEMP"], "icon_orig.png")
ICON_OUT = os.path.join(ROOT, "assets/store/game-icon-512.png")
FG_OUT = os.path.join(ROOT, "assets/store/feature-graphic-1024x500.png")
SCRATCH = os.path.dirname(__file__)

# ---------------------------------------------------------------- icon ----
src = Image.open(ORIG).convert("RGB")
px = src.load()
W = H = 512
L, T, R, B, RAD = 12, 12, 499, 499, 106
CLEAR_X = 140  # artwork-free in the orange bands (cathedral/clock sit elsewhere)
EDGE_X = 18    # artwork-free in the cream band, but inside the tile's corners only on rows 90..425
BEVEL = 28     # rows at the tile's top/bottom carrying its bevel highlight — never sampled or kept


def band_colour(y):
    sy = min(max(y, T + BEVEL), B - BEVEL)
    return px[EDGE_X if 90 <= sy <= 425 else CLEAR_X, sy]


bg = Image.new("RGB", (W, H))
bp = bg.load()
for y in range(H):
    c = band_colour(y)
    for x in range(W):
        bp[x, y] = c

# Paste the original artwork through a mask that follows the tile's rounded
# edge (inset past its anti-aliased rim) but drops the bevel rows top/bottom,
# so none of the tile's own highlight/shadow lines reach the final image.
inset = 8
mask = Image.new("L", (W, H), 0)
ImageDraw.Draw(mask).rounded_rectangle((L + inset, T + inset, R - inset, B - inset), radius=RAD - inset, fill=255)
ImageDraw.Draw(mask).rectangle((0, 0, W, T + BEVEL), fill=0)
ImageDraw.Draw(mask).rectangle((0, B - BEVEL, W, H), fill=0)
icon = bg.copy()
icon.paste(src, (0, 0), mask)
icon.save(ICON_OUT)
icon.save(os.path.join(SCRATCH, "icon_fixed.png"))
print("icon", icon.size, icon.mode)

# ------------------------------------------------------ feature graphic ----
FW, FH = 1024, 500
top_orange = px[CLEAR_X, 40]
bot_orange = px[CLEAR_X, 470]
cream = px[EDGE_X, 250]

fg = Image.new("RGB", (FW, FH))
fp = fg.load()
for y in range(FH):
    t = y / (FH - 1)
    c = tuple(round(top_orange[i] + (bot_orange[i] - top_orange[i]) * t) for i in range(3))
    for x in range(FW):
        fp[x, y] = c
d = ImageDraw.Draw(fg)
# Cream band across the middle, echoing the icon
d.rectangle((0, 150, FW, 350), fill=cream)

# Faint "?" watermark on the right
wm = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
wd = ImageDraw.Draw(wm)
wfont = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 420)
wd.text((880, 40), "?", font=wfont, fill=(255, 255, 255, 46))
fg = Image.alpha_composite(fg.convert("RGBA"), wm)

# Icon tile with rounded corners and a soft shadow
TILE = 400
tile = icon.resize((TILE, TILE), Image.LANCZOS)
tmask = Image.new("L", (TILE, TILE), 0)
ImageDraw.Draw(tmask).rounded_rectangle((0, 0, TILE - 1, TILE - 1), radius=84, fill=255)
tx, ty = 70, 50
shadow = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
ImageDraw.Draw(shadow).rounded_rectangle((tx, ty + 14, tx + TILE, ty + TILE + 14), radius=84, fill=(80, 30, 0, 110))
shadow = shadow.filter(ImageFilter.GaussianBlur(22))
fg = Image.alpha_composite(fg, shadow)
fg.paste(tile, (tx, ty), tmask)

# Title + tagline, sized to fit the right column
d = ImageDraw.Draw(fg)
col_x, col_w = 520, 470
size = 72
while True:
    tfont = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", size)
    bb = d.textbbox((0, 0), "History Date Guesser", font=tfont)
    if bb[2] - bb[0] <= col_w or size <= 30:
        break
    size -= 2
sfont = ImageFont.truetype("C:/Windows/Fonts/seguisb.ttf", 34) if os.path.exists("C:/Windows/Fonts/seguisb.ttf") else ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 34)
title_y = 190
d.text((col_x - bb[0], title_y - bb[1]), "History Date Guesser", font=tfont, fill=(60, 30, 5))
sb = d.textbbox((0, 0), "Guess the year. Master history.", font=sfont)
d.text((col_x - sb[0], title_y + (bb[3] - bb[1]) + 22 - sb[1]), "Guess the year. Master history.", font=sfont, fill=(110, 60, 15))

fg = fg.convert("RGB")
fg.save(FG_OUT)
fg.save(os.path.join(SCRATCH, "feature_fixed.png"))
print("feature", fg.size, fg.mode, "title size", size)
