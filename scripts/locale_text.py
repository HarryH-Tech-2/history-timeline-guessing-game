"""Locale-aware text helpers shared by the store-asset scripts
(compose_dynamic_screenshots.py --locale, promo/build_promo2.py --locale).

- listing(play_locale): the assets/store/listing/<play_locale>.json copy.
- is_cjk(lang): the language has no word spaces and needs a CJK font.
- fonts(lang): font file paths per role for that language.
- fit_lines(): pick the largest font size at which the text fits a width in at
  most N lines, wrapping on spaces (Latin) or between characters with simple
  kinsoku (Japanese), and balancing two-line splits so a headline never ends
  with a lonely word.
"""
import json
import re
from pathlib import Path

from PIL import ImageFont

ROOT = Path(__file__).resolve().parents[1]
LISTING_DIR = ROOT / "assets/store/listing"
WIN_FONTS = "C:/Windows/Fonts"

# Segoe/Palatino have no CJK glyphs. Yu Gothic ships with Windows 10/11; Meiryo
# and MS Gothic are older fallbacks. .ttc files are opened at index 0.
JA_BOLD = ["YuGothB.ttc", "meiryob.ttc", "msgothic.ttc"]
JA_MEDIUM = ["YuGothM.ttc", "meiryo.ttc", "msgothic.ttc"]

LATIN_FONTS = {"black": "seguibl.ttf", "semi": "seguisb.ttf", "serif_b": "palab.ttf",
               "sans_b": "segoeuib.ttf", "sans": "segoeui.ttf"}


def load_listing(play_locale, path=None):
    p = Path(path) if path else LISTING_DIR / f"{play_locale}.json"
    with open(p, encoding="utf-8") as f:
        data = json.load(f)
    data.setdefault("play_locale", play_locale)
    data.setdefault("app_locale", app_locale_of(play_locale))
    return data


def app_locale_of(play_locale):
    pl = play_locale.lower()
    if pl.startswith("ja"):
        return "ja"
    if pl.startswith("pt"):
        return "pt-BR"
    if pl.startswith("es"):
        return "es-419"
    return "en"


def is_cjk(lang):
    return lang.split("-")[0] in ("ja", "zh", "ko")


def _first_existing(names):
    for n in names:
        if Path(WIN_FONTS, n).exists():
            return n
    raise FileNotFoundError(f"none of {names} in {WIN_FONTS}")


def fonts(lang):
    """File names (in C:/Windows/Fonts) per role for this language."""
    if is_cjk(lang):
        bold, med = _first_existing(JA_BOLD), _first_existing(JA_MEDIUM)
        return {"black": bold, "semi": med, "serif_b": bold, "sans_b": bold, "sans": med}
    return dict(LATIN_FONTS)


_cache = {}


def truetype(name, size):
    k = (name, size)
    if k not in _cache:
        path = name if ("/" in name or "\\" in name) else f"{WIN_FONTS}/{name}"
        _cache[k] = ImageFont.truetype(path, size, index=0)
    return _cache[k]


# ------------------------------------------------------------------ wrapping
NO_START = set("。、，．・ー」』）)]］｝！？!?,.:;…‥〜～ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶ％%")
NO_END = set("「『（([［｛")
# Natural Japanese break points: after punctuation or a particle.
JA_GOOD_AFTER = set("、。，・！？!?を、にはがのでともへや")


def tokens(text, lang):
    """Unbreakable units. Latin: words (spaces kept as separate tokens).
    CJK: single characters, but runs of Latin letters/digits stay whole."""
    if not is_cjk(lang):
        return re.findall(r"\S+|\s+", text)
    # katakana words (incl. the long-vowel mark) stay whole: never "ダークモー/ド"
    return re.findall(r"[A-Za-z0-9][A-Za-z0-9,.'%+\-]*|[ァ-ヺー]+|\s+|.", text)


def _is_kanji(ch):
    return "一" <= ch <= "鿿"


def _width(fnt, s):
    return fnt.getlength(s.strip())


def _valid_break(toks, i, lang):
    """Break between toks[i-1] and toks[i]?"""
    if i <= 0 or i >= len(toks):
        return False
    prev, nxt = toks[i - 1], toks[i]
    if not is_cjk(lang):
        return prev.isspace()
    if nxt.isspace():
        return False
    if nxt[0] in NO_START or prev[-1] in NO_END:
        return False
    return True


def wrap(text, fnt, max_w, lang, max_lines=2):
    """Lines for `text` at font `fnt`, or None if it can't fit in max_lines.
    Two-line splits are balanced (minimise the wider line, prefer natural
    break points)."""
    text = " ".join(text.split()) if not is_cjk(lang) else text.strip()
    if _width(fnt, text) <= max_w:
        return [text]
    toks = tokens(text, lang)
    if max_lines >= 2:
        best = None
        for i in range(1, len(toks)):
            if not _valid_break(toks, i, lang):
                continue
            a, b = "".join(toks[:i]).strip(), "".join(toks[i:]).strip()
            wa, wb = _width(fnt, a), _width(fnt, b)
            if wa > max_w or wb > max_w:
                continue
            cost = max(wa, wb)
            prev = toks[i - 1]
            if is_cjk(lang) and prev and prev[-1] in JA_GOOD_AFTER:
                cost *= 0.85
            elif is_cjk(lang) and _is_kanji(prev[-1]) and _is_kanji(toks[i][0]):
                cost *= 1.25  # likely splits a compound word
            elif not is_cjk(lang) and i >= 2 and toks[i - 2][-1:] in (",", ".", ":", ";", "—", "-"):
                cost *= 0.92
            if best is None or cost < best[0]:
                best = (cost, [a, b])
        if best:
            return best[1]
    if max_lines <= 2:
        return None
    # greedy for >2 lines
    lines, cur = [], ""
    for i, tk in enumerate(toks):
        trial = cur + tk
        if cur.strip() and _width(fnt, trial) > max_w and _valid_break(toks, i, lang):
            lines.append(cur.strip())
            cur = tk.lstrip()
        else:
            cur = trial
    lines.append(cur.strip())
    if len(lines) > max_lines or any(_width(fnt, ln) > max_w for ln in lines):
        return None
    return lines


def fit_lines(text, font_name, max_w, lang, size, min_size, max_lines=2, step=2, one_line_min=None):
    """(font, lines): the largest size <= `size` where the text fits in
    max_lines within max_w. With one_line_min, a single line at any size down
    to one_line_min wins over wrapping. Falls back to min_size (warning)."""
    if one_line_min:
        s = size
        while s >= one_line_min:
            fnt = truetype(font_name, s)
            if _width(fnt, text) <= max_w:
                return fnt, [text.strip()]
            s -= step
    s = size
    while s >= min_size:
        fnt = truetype(font_name, s)
        lines = wrap(text, fnt, max_w, lang, max_lines)
        if lines:
            return fnt, lines
        s -= step
    fnt = truetype(font_name, min_size)
    print(f"  WARNING: '{text}' does not fit {max_lines} lines at {min_size}px; check the copy")
    return fnt, (wrap(text, fnt, max_w, lang, 99) or [text])
