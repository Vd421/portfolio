"""Generate app/importmap.json: the import map plus sha384 integrity hashes.

Usage: uv run python scripts/importmap.py

Downloads each pinned package tarball from registry.npmjs.org (jsDelivr serves
the same files byte for byte), walks the module graph from every entry point by
following static and literal dynamic imports, and hashes every module it
reaches. Bare specifiers the import map can't resolve are reported as errors.

Entry points under a prefix mapping (``three/addons/…``, ``gsap/…``) come from
``PREFIX_ENTRIES`` plus whatever ``static/js`` imports, so re-run this after
adding a new addon import.
"""

from __future__ import annotations

import base64
import hashlib
import io
import json
import posixpath
import re
import sys
import tarfile
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.importmap import (  # noqa: E402
    IMPORTMAP_PATH,
    IMPORTS,
    PREFIX_ENTRIES,
    SCRIPTS,
    Package,
    base_imports,
    url_for,
)

REGISTRY = "https://registry.npmjs.org"

_FROM = re.compile(r"""\b(?:import|export)\b[^"'`;]*?\bfrom\s*["']([^"']+)["']""")
_SIDE_EFFECT = re.compile(r"""\bimport\s*["']([^"']+)["']""")
_DYNAMIC = re.compile(r"""\bimport\(\s*["']([^"']+)["']\s*\)""")


def specifiers(source: str) -> set[str]:
    """Module specifiers imported by ``source`` (static and literal dynamic)."""
    found: set[str] = set()
    for pattern in (_FROM, _SIDE_EFFECT, _DYNAMIC):
        found.update(m.group(1) for m in pattern.finditer(source))
    return found


def sri(data: bytes) -> str:
    return "sha384-" + base64.b64encode(hashlib.sha384(data).digest()).decode()


def fetch_package(pkg: Package) -> dict[str, bytes]:
    """All regular files of the package tarball, keyed by path inside the package."""
    url = f"{REGISTRY}/{pkg.name}/-/{pkg.name}-{pkg.version}.tgz"
    with urllib.request.urlopen(url, timeout=60) as resp:
        blob = resp.read()
    files: dict[str, bytes] = {}
    with tarfile.open(fileobj=io.BytesIO(blob), mode="r:gz") as tar:
        for member in tar.getmembers():
            if not member.isfile():
                continue
            # npm tarballs put everything under one top-level folder, usually "package/".
            _, _, inner = member.name.partition("/")
            handle = tar.extractfile(member)
            if inner and handle is not None:
                files[inner] = handle.read()
    return files


def resolve_bare(spec: str, imports: dict[str, str]) -> str | None:
    if spec in imports:
        return imports[spec]
    prefixes = [p for p in imports if p.endswith("/") and spec.startswith(p)]
    if not prefixes:
        return None
    best = max(prefixes, key=len)
    return imports[best] + spec[len(best) :]


def split_url(url: str, packages: dict[str, Package]) -> tuple[Package, str] | None:
    for pkg in packages.values():
        if url.startswith(pkg.base):
            return pkg, url[len(pkg.base) :]
    return None


def app_specifiers(js_dir: Path) -> set[str]:
    found: set[str] = set()
    if js_dir.is_dir():
        for path in sorted(js_dir.rglob("*.js")):
            found |= specifiers(path.read_text(encoding="utf-8", errors="replace"))
    return {s for s in found if not s.startswith((".", "/")) and "://" not in s}


def generate(js_dir: Path = ROOT / "static" / "js") -> tuple[dict[str, object], list[str]]:
    imports = base_imports()
    packages = {pkg.name: pkg for pkg, _ in IMPORTS.values()}
    tarballs: dict[str, dict[str, bytes]] = {}
    errors: list[str] = []

    def files_of(pkg: Package) -> dict[str, bytes]:
        if pkg.name not in tarballs:
            print(f"fetching {pkg.name}@{pkg.version}", file=sys.stderr)
            tarballs[pkg.name] = fetch_package(pkg)
        return tarballs[pkg.name]

    entries: list[str] = [url for spec, url in imports.items() if not spec.endswith("/")]
    for prefix, names in PREFIX_ENTRIES.items():
        entries += [imports[prefix] + name for name in names]
    for spec in sorted(app_specifiers(js_dir)):
        url = resolve_bare(spec, imports)
        if url is None:
            errors.append(f"static/js imports '{spec}', which the import map doesn't define")
        else:
            entries.append(url)

    integrity: dict[str, str] = {}
    queue = list(dict.fromkeys(entries))
    while queue:
        url = queue.pop()
        if url in integrity:
            continue
        located = split_url(url, packages)
        if located is None:
            errors.append(f"{url} is outside the pinned packages")
            continue
        pkg, path = located
        data = files_of(pkg).get(path)
        if data is None:
            errors.append(f"{url} is not in {pkg.name}@{pkg.version}")
            continue
        integrity[url] = sri(data)
        for spec in sorted(specifiers(data.decode("utf-8", errors="replace"))):
            if spec.startswith("."):
                target = posixpath.normpath(posixpath.join(posixpath.dirname(path), spec))
                if target in files_of(pkg):
                    queue.append(pkg.base + target)
                # Relative strings that aren't files are usually code comments; skip them.
            elif "://" in spec:
                errors.append(f"{url} imports an absolute URL: {spec}")
            else:
                resolved = resolve_bare(spec, imports)
                if resolved is None:
                    errors.append(f"{url} imports '{spec}', which the import map doesn't define")
                else:
                    queue.append(resolved)

    scripts: dict[str, dict[str, str]] = {}
    for name, (pkg, path) in SCRIPTS.items():
        data = fetch_package(pkg).get(path)
        if data is None:
            errors.append(f"{path} is not in {pkg.name}@{pkg.version}")
            continue
        scripts[name] = {"url": url_for(pkg, path), "integrity": sri(data)}

    result: dict[str, object] = {
        "imports": imports,
        "integrity": dict(sorted(integrity.items())),
        "scripts": scripts,
    }
    return result, errors


def main() -> int:
    result, errors = generate()
    for error in errors:
        print(f"error: {error}", file=sys.stderr)
    if errors:
        return 1
    IMPORTMAP_PATH.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    count = len(result["integrity"])  # type: ignore[arg-type]
    print(f"wrote {IMPORTMAP_PATH.relative_to(ROOT)} ({count} modules hashed)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
