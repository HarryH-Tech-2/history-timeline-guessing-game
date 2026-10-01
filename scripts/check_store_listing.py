"""Validate the per-language Play store listing copy in assets/store/listing/.

Checks every <locale>.json for the expected keys and the Play Console hard
limits (title 30, short description 80, full description 4000, YouTube title
100), counted with Python len() like the Console does, and warns when a
screenshot caption runs past the soft length the frames are designed for.

    python scripts/check_store_listing.py

Exits 1 when a file is missing, malformed or over a hard limit.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LISTING_DIR = ROOT / "assets" / "store" / "listing"
FILES = ["en-US.json", "pt-BR.json", "es-419.json", "ja-JP.json"]
PLAY_LINK = "https://play.google.com/store/apps/details?id=com.harryhh.historydateguesser"
MUSIC_CREDIT = (
    '"Ancient Rite" Kevin MacLeod (incompetech.com)\n'
    "Licensed under Creative Commons: By Attribution 4.0 License\n"
    "http://creativecommons.org/licenses/by/4.0/"
)

HARD_LIMITS = {"title": 30, "short_description": 80, "full_description": 4000, "youtube.title": 100}
SCREENSHOTS = [
    "01-guess", "02-reveal", "03-campaign", "04-modes",
    "05-leaderboard", "06-museum", "07-achievements", "08-dark",
]
# Soft caption limits (Latin, Japanese): frames are designed around these.
SOFT_HEAD = (22, 12)
SOFT_SUB = (48, 26)
VIDEO_KEYS = {
    "question": list, "statement": list, "drag_kicker": str, "drag_lines": list,
    "reveal_kicker": str, "reveal_line": str, "brand": str, "cta": str,
    "end_lines": list, "tagline": str,
}
TOP_KEYS = {
    "play_locale", "app_locale", "title", "short_description",
    "full_description", "screenshots", "video", "youtube",
}


def check(path: Path) -> tuple[dict[str, int], list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    counts: dict[str, int] = {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        return counts, [f"cannot load: {exc}"], warnings

    missing = TOP_KEYS - data.keys()
    extra = data.keys() - TOP_KEYS
    if missing:
        errors.append(f"missing keys: {sorted(missing)}")
    if extra:
        errors.append(f"unexpected keys: {sorted(extra)}")
    if data.get("play_locale") != path.stem:
        errors.append(f"play_locale {data.get('play_locale')!r} does not match file name")

    for key in ("title", "short_description", "full_description"):
        value = data.get(key)
        if not isinstance(value, str) or not value.strip():
            errors.append(f"{key} must be a non-empty string")
            continue
        counts[key] = len(value)
    youtube = data.get("youtube") or {}
    for key in ("title", "description"):
        if not isinstance(youtube.get(key), str) or not youtube[key].strip():
            errors.append(f"youtube.{key} must be a non-empty string")
    if isinstance(youtube.get("title"), str):
        counts["youtube.title"] = len(youtube["title"])
    description = youtube.get("description", "")
    if isinstance(description, str):
        if not description.rstrip().endswith(MUSIC_CREDIT):
            errors.append("youtube.description must end with the music credit from promo/MUSIC-CREDIT.txt")
        if PLAY_LINK not in description:
            errors.append("youtube.description must include the Play link")

    for key, limit in HARD_LIMITS.items():
        if key in counts and counts[key] > limit:
            errors.append(f"{key} is {counts[key]} chars (limit {limit})")

    japanese = str(data.get("app_locale")) == "ja"
    shots = data.get("screenshots") or {}
    if set(shots) != set(SCREENSHOTS):
        errors.append(f"screenshots keys differ: {sorted(set(SCREENSHOTS) ^ set(shots))}")
    for name in SCREENSHOTS:
        shot = shots.get(name) or {}
        for field, soft in (("head", SOFT_HEAD), ("sub", SOFT_SUB)):
            text = shot.get(field)
            if not isinstance(text, str) or not text.strip():
                errors.append(f"screenshots.{name}.{field} missing")
                continue
            limit = soft[1] if japanese else soft[0]
            if len(text) > limit:
                warnings.append(f"screenshots.{name}.{field} is {len(text)} chars (soft {limit}): {text}")

    video = data.get("video") or {}
    for key, kind in VIDEO_KEYS.items():
        value = video.get(key)
        if not isinstance(value, kind):
            errors.append(f"video.{key} must be a {kind.__name__}")
        elif kind is list and (len(value) != 2 or not all(isinstance(v, str) and v for v in value)):
            errors.append(f"video.{key} must be two non-empty lines")
    if set(video) - VIDEO_KEYS.keys():
        errors.append(f"unexpected video keys: {sorted(set(video) - VIDEO_KEYS.keys())}")

    return counts, errors, warnings


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    columns = ["title", "short_description", "full_description", "youtube.title"]
    header = f"{'file':<14}" + "".join(f"{c} (/{HARD_LIMITS[c]})".rjust(26) for c in columns) + "  status"
    print(header)
    print("-" * len(header))
    failed = False
    notes: list[str] = []
    for name in FILES:
        path = LISTING_DIR / name
        if not path.exists():
            print(f"{name:<14}{'MISSING'.rjust(26)}")
            failed = True
            continue
        counts, errors, warnings = check(path)
        cells = "".join(str(counts.get(c, "-")).rjust(26) for c in columns)
        status = "FAIL" if errors else ("ok (warnings)" if warnings else "ok")
        print(f"{name:<14}{cells}  {status}")
        failed = failed or bool(errors)
        notes += [f"  {name}: ERROR {e}" for e in errors]
        notes += [f"  {name}: warn  {w}" for w in warnings]
    if notes:
        print()
        print("\n".join(notes))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
