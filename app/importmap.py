"""The browser import map for the pinned CDN modules.

Pins come from CONTRACTS.md. ``scripts/importmap.py`` downloads the same
package versions from the npm registry (jsDelivr serves npm's bytes unchanged)
and writes ``app/importmap.json`` with a sha384 ``integrity`` entry for every
module file reachable from each entry point. The app renders that JSON inline
in ``<script type="importmap">``.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from markupsafe import Markup

IMPORTMAP_PATH = Path(__file__).resolve().parent / "importmap.json"
CDN = "https://cdn.jsdelivr.net/npm"


@dataclass(frozen=True)
class Package:
    name: str
    version: str

    @property
    def base(self) -> str:
        return f"{CDN}/{self.name}@{self.version}/"


THREE = Package("three", "0.186.1")
POSTPROCESSING = Package("postprocessing", "6.39.5")
GSAP = Package("gsap", "3.15.0")
LENIS = Package("lenis", "1.3.27")
HTMX = Package("htmx.org", "2.0.11")

# specifier -> (package, path inside the package). A trailing "/" maps a prefix.
IMPORTS: dict[str, tuple[Package, str]] = {
    "three": (THREE, "build/three.module.js"),
    "three/addons/": (THREE, "examples/jsm/"),
    "postprocessing": (POSTPROCESSING, "build/index.js"),
    "gsap": (GSAP, "index.js"),
    "gsap/": (GSAP, ""),
    "lenis": (LENIS, "dist/lenis.mjs"),
}

# Files under a prefix mapping that always get integrity hashes, on top of any
# found by scanning static/js for imports.
PREFIX_ENTRIES: dict[str, list[str]] = {
    "gsap/": ["ScrollTrigger.js", "SplitText.js"],
}

# Classic (non-module) scripts, rendered with SRI by ``cdn_script()``.
SCRIPTS: dict[str, tuple[Package, str]] = {
    "htmx": (HTMX, "dist/htmx.min.js"),
}


def url_for(package: Package, path: str) -> str:
    return package.base + path


def base_imports() -> dict[str, str]:
    return {spec: url_for(pkg, path) for spec, (pkg, path) in IMPORTS.items()}


@dataclass(frozen=True)
class ImportMap:
    imports: dict[str, str]
    integrity: dict[str, str]
    scripts: dict[str, dict[str, str]]

    @classmethod
    def load(cls, path: Path = IMPORTMAP_PATH) -> ImportMap:
        """Load the generated JSON; without it, fall back to the pins with no SRI."""
        try:
            data: dict[str, Any] = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            data = {}
        imports = dict(data.get("imports") or base_imports())
        scripts = dict(data.get("scripts") or {})
        for name, (pkg, file) in SCRIPTS.items():
            scripts.setdefault(name, {"url": url_for(pkg, file)})
        return cls(imports=imports, integrity=dict(data.get("integrity") or {}), scripts=scripts)

    def json(self) -> str:
        body: dict[str, Any] = {"imports": self.imports}
        if self.integrity:
            body["integrity"] = dict(sorted(self.integrity.items()))
        # "</" can't appear in valid JSON values here, but escape it anyway so the
        # inline script can never be closed early.
        return json.dumps(body, separators=(",", ":")).replace("</", "<\\/")

    def script_tag(self, nonce: str | None) -> Markup:
        nonce_attr = f' nonce="{Markup.escape(nonce)}"' if nonce else ""
        return Markup(f'<script type="importmap"{nonce_attr}>{self.json()}</script>')

    def cdn_script(self, name: str) -> Markup:
        entry = self.scripts[name]
        url = Markup.escape(entry["url"])
        sri = entry.get("integrity")
        extra = f' integrity="{Markup.escape(sri)}" crossorigin="anonymous"' if sri else ""
        return Markup(f'<script src="{url}"{extra} defer></script>')
