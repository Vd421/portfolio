"""Copy static assets into a content-hashed directory and write the manifest.

Usage: uv run python scripts/build_assets.py   (run scripts/tailwind.sh first)

Output: static/dist/<hash>/… and static/dist/manifest.json. See app/assets.py
for why the whole tree is hashed rather than each file.
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.assets import STATIC_DIR, build  # noqa: E402


def main() -> int:
    if not (STATIC_DIR / "dist" / "app.css").is_file():
        print(
            "warning: static/dist/app.css is missing; run scripts/tailwind.sh first",
            file=sys.stderr,
        )
    manifest = build()
    print(f"built {len(manifest.files)} assets into {manifest.base}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
