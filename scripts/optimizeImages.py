"""Convert bundled raster assets to WebP and repoint the code that requires them.

    python scripts/optimizeImages.py

Question art (assets/questions/*.jpg — written as JPEG by generateQuestionImages.ts)
and the handful of large backdrops become WebP at the same pixel size: lossy q80
for photos/illustrations, lossless-alpha for the mascot cut-out. Android and iOS
decode WebP natively, so there is no runtime cost; the APK just gets smaller.
Originals are deleted after a successful conversion and every `require(...)`
in src/ that pointed at them is rewritten to the .webp path, so run it right
after generating new question images.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
QUALITY = 80

# Files outside assets/questions worth converting (alpha ones are kept lossless).
EXTRA = [
    ROOT / "assets" / "leaderboard-bg.jpg",
    ROOT / "assets" / "campaign-map-bg.jpg",
    ROOT / "assets" / "mascot" / "owl.png",
    ROOT / "assets" / "founder.jpg",
]


def convert(src: Path) -> tuple[Path, int, int]:
    dst = src.with_suffix(".webp")
    with Image.open(src) as im:
        has_alpha = im.mode in ("RGBA", "LA") or "transparency" in im.info
        if has_alpha:
            im.convert("RGBA").save(dst, "WEBP", lossless=True, method=6)
        else:
            im.convert("RGB").save(dst, "WEBP", quality=QUALITY, method=6)
    before, after = src.stat().st_size, dst.stat().st_size
    if after >= before:  # WebP lost; keep the original
        dst.unlink()
        return src, before, before
    src.unlink()
    return dst, before, after


def rewrite_requires(renamed: dict[str, str]) -> int:
    """Point every require('…/<old>') in src/ at the new file name."""
    count = 0
    for path in (ROOT / "src").rglob("*.ts*"):
        text = path.read_text("utf8")
        new = text
        for old, fresh in renamed.items():
            new = re.sub(rf"(require\('[^']*/){re.escape(old)}('\))", rf"\g<1>{fresh}\2", new)
        if new != text:
            path.write_text(new, "utf8")
            count += 1
    return count


def main() -> int:
    targets = sorted((ROOT / "assets" / "questions").glob("*.jp*g")) + sorted(
        (ROOT / "assets" / "questions").glob("*.png")
    )
    targets += [p for p in EXTRA if p.exists()]
    if not targets:
        print("Nothing to convert.")
        return 0

    renamed: dict[str, str] = {}
    total_before = total_after = 0
    for src in targets:
        dst, before, after = convert(src)
        total_before += before
        total_after += after
        if dst != src:
            renamed[src.name] = dst.name

    files = rewrite_requires(renamed)
    saved = total_before - total_after
    print(
        f"Converted {len(renamed)}/{len(targets)} files: "
        f"{total_before / 1e6:.1f} MB -> {total_after / 1e6:.1f} MB "
        f"(-{saved / 1e6:.1f} MB, {100 * saved // max(total_before, 1)}%); "
        f"rewrote requires in {files} source files"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
