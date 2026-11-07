"""Print every placeholder and unverified claim in /content.

Usage: uv run python scripts/todos.py [--strict]

With --strict, exits 1 when anything is left, so it can gate a release.
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.content import load_content  # noqa: E402


def main(argv: list[str]) -> int:
    todos = load_content().todos()
    for line in todos:
        print(f"- [ ] {line}")
    print(f"\n{len(todos)} item(s) left to fill in or confirm.", file=sys.stderr)
    return 1 if todos and "--strict" in argv else 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
