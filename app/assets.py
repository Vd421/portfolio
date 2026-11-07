"""Content-hashed static assets.

Strategy: hash the whole asset tree into one directory,
``static/dist/<hash>/``, instead of renaming each file.

Browser ES modules import each other by relative URL (``main.js`` imports
``./core/motion.js``), shaders are fetched relative to ``import.meta.url``, and
CSS points at fonts with ``url(../fonts/…)``. Renaming individual files breaks
every one of those references unless each is rewritten. Copying the tree
unchanged into a directory named after the hash of all its files keeps every
relative reference valid, and the URL still changes whenever any byte changes,
so everything under it can be cached forever.

Layout inside the hashed directory mirrors ``static/`` (``js/``, ``shaders/``,
``fonts/``, ``img/``), and the Tailwind output ``static/dist/app.css`` lands at
``css/app.css`` so that ``url(../fonts/x.woff2)`` resolves the same way in dev
(``/static/dist/app.css`` -> ``/static/fonts/``) and in prod.
"""

from __future__ import annotations

import hashlib
import json
import shutil
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STATIC_DIR = ROOT / "static"
DIST_DIR = STATIC_DIR / "dist"
MANIFEST_NAME = "manifest.json"
URL_PREFIX = "/static"

# Source directories under static/ copied into the hashed tree.
SOURCE_DIRS = ("js", "shaders", "fonts", "img")
# Built files: logical path in the hashed tree -> source path relative to static/.
BUILT_FILES = {"css/app.css": "dist/app.css"}
# Extra names templates may use for a built file.
ALIASES = {"dist/app.css": "css/app.css"}
HASH_LENGTH = 12
SKIP_NAMES = {".DS_Store", ".gitkeep"}


@dataclass(frozen=True)
class Manifest:
    hash: str
    base: str  # URL prefix, e.g. "/static/dist/3f2a9c1b0d4e/"
    files: dict[str, str] = field(default_factory=dict)  # logical path -> URL

    def to_json(self) -> str:
        data = {"hash": self.hash, "base": self.base, "files": dict(sorted(self.files.items()))}
        return json.dumps(data, indent=2) + "\n"

    @classmethod
    def load(cls, path: Path) -> Manifest | None:
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            return cls(hash=str(data["hash"]), base=str(data["base"]), files=dict(data["files"]))
        except (OSError, ValueError, KeyError, TypeError):
            return None


def _collect(static_dir: Path) -> dict[str, Path]:
    """Logical path -> source file, for every file that goes into the hashed tree."""
    found: dict[str, Path] = {}
    for name in SOURCE_DIRS:
        base = static_dir / name
        if not base.is_dir():
            continue
        for path in sorted(base.rglob("*")):
            if path.is_file() and path.name not in SKIP_NAMES:
                found[path.relative_to(static_dir).as_posix()] = path
    for logical, source in BUILT_FILES.items():
        src = static_dir / source
        if src.is_file():
            found[logical] = src
    return found


def tree_hash(files: dict[str, Path]) -> str:
    digest = hashlib.sha256()
    for logical in sorted(files):
        digest.update(logical.encode())
        digest.update(b"\0")
        digest.update(hashlib.sha256(files[logical].read_bytes()).digest())
    return digest.hexdigest()[:HASH_LENGTH]


def build(static_dir: Path = STATIC_DIR) -> Manifest:
    """Copy assets into ``static/dist/<hash>/`` and write ``static/dist/manifest.json``.

    Older hashed directories are removed; ``static/dist/app.css`` (the Tailwind
    output used in dev) is left in place.
    """
    dist = static_dir / "dist"
    files = _collect(static_dir)
    digest = tree_hash(files)
    target = dist / digest
    if target.exists():
        shutil.rmtree(target)
    for logical, src in files.items():
        out = target / logical
        out.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, out)
    for child in dist.iterdir():
        if child.is_dir() and child.name != digest and _looks_hashed(child.name):
            shutil.rmtree(child)

    base = f"{URL_PREFIX}/dist/{digest}/"
    urls = {logical: base + logical for logical in files}
    for alias, logical in ALIASES.items():
        if logical in urls:
            urls[alias] = urls[logical]
    manifest = Manifest(hash=digest, base=base, files=urls)
    (dist / MANIFEST_NAME).write_text(manifest.to_json(), encoding="utf-8")
    return manifest


def _looks_hashed(name: str) -> bool:
    return len(name) == HASH_LENGTH and all(c in "0123456789abcdef" for c in name)


def is_hashed_url(path: str) -> bool:
    """True for a URL path inside a hashed build directory."""
    prefix = f"{URL_PREFIX}/dist/"
    if not path.startswith(prefix):
        return False
    head = path[len(prefix) :].split("/", 1)
    return len(head) == 2 and _looks_hashed(head[0])


class AssetResolver:
    """``asset(path)`` for templates.

    Uses the manifest when ``hashed`` is true and the manifest exists, otherwise
    plain ``/static/<path>``. ``css/app.css`` maps to the dev Tailwind output.
    """

    def __init__(self, manifest: Manifest | None, hashed: bool) -> None:
        self.manifest = manifest if hashed else None

    def __call__(self, path: str) -> str:
        path = path.lstrip("/")
        path = path.removeprefix("static/")
        if self.manifest is not None:
            url = self.manifest.files.get(path)
            if url is not None:
                return url
        dev_source = BUILT_FILES.get(ALIASES.get(path, path))
        return f"{URL_PREFIX}/{dev_source or path}"
