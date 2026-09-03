"""Build the History Date Guesser promo video (1920x1080, 30fps).

Scenes are rendered individually to tmp, then joined with xfade and mixed with
the hook clip's audio plus a synthesized ambient bed.
"""
import os
import subprocess
import sys
from PIL import Image, ImageDraw, ImageFilter

ROOT = "C:/Users/harry/Documents/code/history-date-guessing-game"
PROMO = f"{ROOT}/promo"
T = "C:/Users/harry/.claude/jobs/b40c9d50/tmp"
OUT = sys.argv[1] if len(sys.argv) > 1 else f"{PROMO}/history-date-guesser-promo.mp4"

W, H, FPS = 1920, 1080, 30
BOLD = "C\\:/Windows/Fonts/segoeuib.ttf"
REG = "C\\:/Windows/Fonts/segoeui.ttf"
CREAM = "0xF7F3EA"
ORANGE = "0xE8891E"
MUTED = "0xC9BFAF"
BG = "#161210"

# Phone geometry: crop status/nav bars from the 1080x2340 recording.
CROP = "crop=1080:2110:0:95"
PH_H = 930
PH_W = round(1080 * PH_H / 2110)  # 476
PH_X, PH_Y = 300, (H - PH_H) // 2
RADIUS = 46
TEXT_X = 880


def run(args):
    print(" ".join(a if " " not in a else f'"{a}"' for a in args[:3]), "...")
    subprocess.run(args, check=True)


def ff(*args):
    run(["ffmpeg", "-v", "error", "-y", *args])


def esc(s):
    return s.replace("\\", "\\\\").replace("'", "\u2019").replace(":", "\\:").replace(",", "\\,").replace("%", "\\%")


def fade_alpha(a, b, f=0.35):
    return (f"if(lt(t\\,{a})\\,0\\,if(lt(t\\,{a + f})\\,(t-{a})/{f}\\,"
            f"if(lt(t\\,{b - f})\\,1\\,if(lt(t\\,{b})\\,({b}-t)/{f}\\,0))))")


def text(s, x, y, size, color=CREAM, font=BOLD, a=None, b=None, spacing=14, shadow=True):
    d = (f"drawtext=fontfile='{font}':text='{esc(s)}':x={x}:y={y}:fontsize={size}"
         f":fontcolor={color}:line_spacing={spacing}")
    if shadow:
        d += ":shadowcolor=black@0.55:shadowx=0:shadowy=3"
    if a is not None:
        d += f":alpha='{fade_alpha(a, b)}'"
    return d


def caption(label, lines, a, b, y=None):
    """Orange kicker + big cream caption to the right of the phone."""
    n = len(lines)
    block = 44 + 20 + n * 84
    y0 = (H - block) // 2 if y is None else y
    parts = [text(label, TEXT_X, y0, 30, ORANGE, a=a, b=b)]
    for i, ln in enumerate(lines):
        parts.append(text(ln, TEXT_X, y0 + 64 + i * 84, 70, a=a, b=b))
    return ",".join(parts)


# ---------- static assets (PIL) ----------
def make_assets():
    # background with soft vignette + faint orange glow behind the phone
    bg = Image.new("RGB", (W, H), BG)
    glow = Image.new("RGB", (W, H), (0, 0, 0))
    g = ImageDraw.Draw(glow)
    g.ellipse([PH_X - 260, PH_Y - 200, PH_X + PH_W + 260, PH_Y + PH_H + 200], fill=(70, 40, 18))
    glow = glow.filter(ImageFilter.GaussianBlur(180))
    bg = Image.blend(bg, Image.eval(glow, lambda v: v), 0.0)
    bg = Image.fromarray(__import__("numpy").clip(
        __import__("numpy").asarray(bg).astype(int) + __import__("numpy").asarray(glow).astype(int), 0, 255).astype("uint8"))
    bg.save(f"{T}/bg.png")

    plain = Image.new("RGB", (W, H), BG)
    plain.save(f"{T}/bg-plain.png")

    # phone bezel + shadow, canvas-sized RGBA
    bez = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle(
        [PH_X - 14, PH_Y + 10, PH_X + PH_W + 14, PH_Y + PH_H + 40], radius=RADIUS + 14, fill=(0, 0, 0, 190))
    sh = sh.filter(ImageFilter.GaussianBlur(28))
    bez.alpha_composite(sh)
    d = ImageDraw.Draw(bez)
    d.rounded_rectangle([PH_X - 14, PH_Y - 14, PH_X + PH_W + 14, PH_Y + PH_H + 14],
                        radius=RADIUS + 14, fill=(28, 24, 21, 255), outline=(70, 62, 55, 255), width=2)
    bez.save(f"{T}/bezel.png")

    # rounded mask for the screen
    m = Image.new("L", (PH_W, PH_H), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, PH_W - 1, PH_H - 1], radius=RADIUS, fill=255)
    m.save(f"{T}/mask.png")

    # rounded app icon
    ic = Image.open(f"{ROOT}/assets/store/game-icon-512.png").convert("RGBA").resize((300, 300), Image.LANCZOS)
    im = Image.new("L", ic.size, 0)
    ImageDraw.Draw(im).rounded_rectangle([0, 0, 299, 299], radius=66, fill=255)
    ic.putalpha(im)
    ic.save(f"{T}/icon.png")

    owl = Image.open(f"{ROOT}/assets/mascot/owl.png").convert("RGBA")
    owl = owl.resize((round(601 * 430 / 640), 430), Image.LANCZOS)
    owl.save(f"{T}/owl.png")

    # dark gradient band for hook captions
    band = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    px = band.load()
    for y in range(H):
        a = 0 if y < 620 else int(min(1.0, (y - 620) / 300) * 175)
        for x in range(W):
            px[x, y] = (0, 0, 0, a)
    band.save(f"{T}/band.png")


# ---------- scene builders ----------
def phone_scene(src, dur, filters, out, ss=None, still=False):
    """Compose a phone recording (or still) onto the background with captions."""
    inputs = ["-i", f"{T}/bg.png", "-i", f"{T}/bezel.png", "-i", f"{T}/mask.png"]
    if still:
        inputs += ["-loop", "1", "-t", str(dur), "-i", src]
    else:
        if ss is not None:
            inputs += ["-ss", str(ss)]
        inputs += ["-t", str(dur), "-i", src]
    fc = (f"[0:v]loop=loop=-1:size=1:start=0,fps={FPS},trim=duration={dur}[bg];"
          f"[1:v]loop=loop=-1:size=1:start=0,fps={FPS},trim=duration={dur}[bez];"
          f"[3:v]{CROP},scale={PH_W}:{PH_H},fps={FPS}[scr];"
          f"[2:v]loop=loop=-1:size=1:start=0,fps={FPS},trim=duration={dur}[mask];"
          f"[scr][mask]alphamerge[scrm];"
          f"[bg][bez]overlay=0:0:format=auto[b1];"
          f"[b1][scrm]overlay={PH_X}:{PH_Y}:format=auto,{filters},"
          f"format=yuv420p,trim=duration={dur},setpts=PTS-STARTPTS[v]")
    ff(*inputs, "-filter_complex", fc, "-map", "[v]", "-r", str(FPS), "-t", str(dur),
       "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p", out)


def hook_scene(out):
    dur = 8.0
    filters = ",".join([
        "[0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=30[h]",
        "[h][1:v]overlay=0:0:format=auto[hb]",
        "[hb]" + text("July 1969. You know the moment.", 110, 790, 74, a=0.8, b=4.4),
        text("But could you place the year?", 110, 790, 74, a=4.6, b=7.9),
        text("HISTORY DATE GUESSER", 110, 900, 30, ORANGE, a=0.8, b=7.9),
        "fade=t=out:st=7.5:d=0.5,format=yuv420p[v]",
    ])
    # fix the chain syntax: first three items are a graph, rest are filters on [hb]
    fc = (f"[0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=30[h];"
          f"[h][1:v]overlay=0:0:format=auto,"
          + text("July 1969. You know the moment.", 110, 790, 74, a=0.8, b=4.4) + ","
          + text("But could you place the year?", 110, 790, 74, a=4.6, b=7.9) + ","
          + text("HISTORY DATE GUESSER", 110, 900, 30, ORANGE, a=0.8, b=7.9) + ","
          + "fade=t=out:st=7.5:d=0.5,format=yuv420p[v]")
    ff("-t", str(dur), "-i", f"{PROMO}/hook-apollo.mp4", "-loop", "1", "-t", str(dur), "-i", f"{T}/band.png",
       "-filter_complex", fc, "-map", "[v]", "-r", str(FPS), "-t", str(dur),
       "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p", out)


def title_scene(out):
    dur = 3.6
    fc = (f"[0:v]loop=loop=-1:size=1:start=0,fps={FPS},trim=duration={dur}[bg];"
          f"[1:v]loop=loop=-1:size=1:start=0,fps={FPS},trim=duration={dur}[ic];"
          f"[bg][ic]overlay=(W-w)/2:250:format=auto,"
          + text("History Date Guesser", "(w-text_w)/2", 600, 96, a=0.2, b=dur) + ","
          + text("Slide the timeline. Guess the year.", "(w-text_w)/2", 740, 46, MUTED, REG, a=0.6, b=dur) + ","
          + f"fade=t=in:st=0:d=0.4,format=yuv420p[v]")
    ff("-i", f"{T}/bg-plain.png", "-i", f"{T}/icon.png", "-filter_complex", fc, "-map", "[v]",
       "-r", str(FPS), "-t", str(dur), "-c:v", "libx264", "-preset", "medium", "-crf", "17",
       "-pix_fmt", "yuv420p", out)


def end_scene(out):
    dur = 5.0
    fc = (f"[0:v]loop=loop=-1:size=1:start=0,fps={FPS},trim=duration={dur}[bg];"
          f"[1:v]loop=loop=-1:size=1:start=0,fps={FPS},trim=duration={dur}[ic];"
          f"[2:v]loop=loop=-1:size=1:start=0,fps={FPS},trim=duration={dur}[owl];"
          f"[bg][owl]overlay=1440:(H-h)/2+30:format=auto[b1];"
          f"[b1][ic]overlay=180:300:format=auto,"
          + text("History Date Guesser", 530, 300, 88, a=0.2, b=dur) + ","
          + text("5,000 years of history. One timeline.", 530, 430, 42, MUTED, REG, a=0.5, b=dur) + ","
          + text("Free on Google Play", 530, 560, 50, ORANGE, a=0.9, b=dur) + ","
          + f"fade=t=out:st={dur - 0.7}:d=0.7,format=yuv420p[v]")
    ff("-i", f"{T}/bg-plain.png", "-i", f"{T}/icon.png", "-i", f"{T}/owl.png", "-filter_complex", fc,
       "-map", "[v]", "-r", str(FPS), "-t", str(dur), "-c:v", "libx264", "-preset", "medium", "-crf", "17",
       "-pix_fmt", "yuv420p", out)


def build_scenes():
    scenes = []

    hook_scene(f"{T}/sc0.mp4"); scenes.append((f"{T}/sc0.mp4", 8.0))
    title_scene(f"{T}/sc1.mp4"); scenes.append((f"{T}/sc1.mp4", 3.6))

    d = 5.7
    phone_scene(f"{T}/seg-jenny.mp4", d, ",".join([
        caption("HOW TO PLAY", ["Drag the timeline", "to your year"], 0.2, 3.0),
        caption("SCORING", ["The closer you get,", "the more you score"], 3.2, d),
    ]), f"{T}/sc2.mp4"); scenes.append((f"{T}/sc2.mp4", d))

    d = 2.8
    phone_scene(f"{T}/take2-cfr.mp4", d, caption("NO MULTIPLE CHOICE", ["Just you, the timeline", "and 5,000 years"], 0.1, d),
                f"{T}/sc3.mp4", ss=109.5); scenes.append((f"{T}/sc3.mp4", d))

    d = 3.8
    phone_scene(f"{T}/take2-cfr.mp4", d, caption("PERFECT", ["Nail the exact year", "for a perfect 1,000"], 0.1, d),
                f"{T}/sc4.mp4", ss=129.2); scenes.append((f"{T}/sc4.mp4", d))

    d = 4.5
    phone_scene(f"{T}/seg-trieste.mp4", d, caption("LEARN", ["Read the real story", "behind every date"], 0.1, d),
                f"{T}/sc5.mp4"); scenes.append((f"{T}/sc5.mp4", d))

    d = 6.0
    phone_scene(f"{T}/home.png", d, ",".join([
        caption("FIVE WAYS TO PLAY", ["Daily challenge, Survival,", "Campaign and Endless"], 0.1, 3.0),
        caption("EVERY DAY", ["200 questions, 8 categories", "and a new topic each day"], 3.2, d),
    ]), f"{T}/sc6.mp4", still=True); scenes.append((f"{T}/sc6.mp4", d))

    end_scene(f"{T}/sc7.mp4"); scenes.append((f"{T}/sc7.mp4", 5.0))
    return scenes


def assemble(scenes):
    XF = 0.4
    n = len(scenes)
    inputs = []
    for p, _ in scenes:
        inputs += ["-i", p]
    inputs += ["-i", f"{PROMO}/hook-apollo.mp4"]  # audio source, index n
    # xfade chain
    fc = ""
    total = scenes[0][1]
    prev = "[0:v]"
    for i in range(1, n):
        off = total - XF
        lbl = f"[x{i}]" if i < n - 1 else "[v]"
        fc += f"{prev}[{i}:v]xfade=transition=fade:duration={XF}:offset={off:.3f}{lbl};"
        prev = lbl
        total = off + scenes[i][1]
    dur = total
    # ambient bed: detuned sines, slow tremolo, low-passed
    bed = ("aevalsrc='0.16*sin(2*PI*73.42*t)+0.12*sin(2*PI*73.9*t)+0.10*sin(2*PI*110*t)"
           "+0.07*sin(2*PI*146.83*t)*(0.75+0.25*sin(2*PI*0.21*t))"
           "+0.05*sin(2*PI*220*t)*(0.7+0.3*sin(2*PI*0.13*t+1))"
           "+0.04*sin(2*PI*293.66*t)*(0.6+0.4*sin(2*PI*0.09*t+2))':s=48000:c=stereo")
    fc += (f"{bed},lowpass=f=700,aecho=0.6:0.4:120|240:0.25|0.15,"
           f"atrim=duration={dur:.3f},afade=t=in:st=6.5:d=3,afade=t=out:st={dur - 2.5:.3f}:d=2.5,"
           f"volume=0.9[bed];"
           f"[{n}:a]atrim=duration=8.2,afade=t=in:st=0:d=0.3,afade=t=out:st=7.2:d=1.0,"
           f"apad=whole_dur={dur:.3f},volume=1.4[hook];"
           f"[hook][bed]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]")
    ff(*inputs, "-filter_complex", fc, "-map", "[v]", "-map", "[a]", "-r", str(FPS),
       "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
       "-c:a", "aac", "-b:a", "192k", "-shortest", OUT)
    return dur


if __name__ == "__main__":
    make_assets()
    scenes = build_scenes()
    dur = assemble(scenes)
    print(f"done: {OUT} ({dur:.1f}s)")
