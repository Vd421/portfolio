from __future__ import annotations

import base64
import hashlib
import json
import re
import sys
from pathlib import Path

import pytest

from app.importmap import IMPORTMAP_PATH, ImportMap, base_imports

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import importmap as gen  # noqa: E402

CONTRACT = {
    "three": "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/",
    "postprocessing": "https://cdn.jsdelivr.net/npm/postprocessing@6.39.5/build/index.js",
    "gsap": "https://cdn.jsdelivr.net/npm/gsap@3.15.0/index.js",
    "gsap/": "https://cdn.jsdelivr.net/npm/gsap@3.15.0/",
    "lenis": "https://cdn.jsdelivr.net/npm/lenis@1.3.27/dist/lenis.mjs",
}
HTMX = "https://cdn.jsdelivr.net/npm/htmx.org@2.0.11/dist/htmx.min.js"
SRI = re.compile(r"^sha384-[A-Za-z0-9+/]{64}$")


def test_pins_match_contract() -> None:
    assert base_imports() == CONTRACT


def test_generated_json_matches_contract() -> None:
    data = json.loads(IMPORTMAP_PATH.read_text())
    assert data["imports"] == CONTRACT
    integrity = data["integrity"]
    for spec, url in CONTRACT.items():
        if not spec.endswith("/"):
            assert url in integrity, spec
    for must in (
        "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.core.js",
        "https://cdn.jsdelivr.net/npm/gsap@3.15.0/gsap-core.js",
        "https://cdn.jsdelivr.net/npm/gsap@3.15.0/CSSPlugin.js",
        "https://cdn.jsdelivr.net/npm/gsap@3.15.0/ScrollTrigger.js",
        "https://cdn.jsdelivr.net/npm/gsap@3.15.0/SplitText.js",
    ):
        assert must in integrity
    assert all(SRI.match(v) for v in integrity.values())
    assert data["scripts"]["htmx"]["url"] == HTMX
    assert SRI.match(data["scripts"]["htmx"]["integrity"])


def test_script_tag() -> None:
    im = ImportMap.load()
    tag = str(im.script_tag("abc123"))
    assert tag.startswith('<script type="importmap" nonce="abc123">')
    body = json.loads(
        tag.removeprefix('<script type="importmap" nonce="abc123">')[: -len("</script>")]
    )
    assert body["imports"] == CONTRACT
    assert body["integrity"]
    assert "</script>" not in tag[: -len("</script>")]


def test_cdn_script_has_sri() -> None:
    tag = str(ImportMap.load().cdn_script("htmx"))
    assert f'src="{HTMX}"' in tag
    assert 'integrity="sha384-' in tag
    assert 'crossorigin="anonymous"' in tag
    assert tag.endswith(" defer></script>")


def test_load_without_json_falls_back(tmp_path: Path) -> None:
    im = ImportMap.load(tmp_path / "missing.json")
    assert im.imports == CONTRACT
    assert im.integrity == {}
    assert "integrity" not in im.json()
    assert im.scripts["htmx"]["url"] == HTMX


def test_specifier_parsing() -> None:
    src = """
    import { a } from "./a.js";
    import*as b from'./b.js';
    export { c } from "./c.js";
    export * from "three";
    import "./side.js";
    const d = await import("./lazy.js");
    import{e as f}from"gsap/ScrollTrigger.js";
    """
    assert gen.specifiers(src) == {
        "./a.js",
        "./b.js",
        "./c.js",
        "three",
        "./side.js",
        "./lazy.js",
        "gsap/ScrollTrigger.js",
    }


def test_graph_walk_with_fake_packages(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    fake = {
        "three": {
            "build/three.module.js": b'export * from "./three.core.js";',
            "build/three.core.js": b"export const REVISION = 1;",
            "examples/jsm/controls/OrbitControls.js": b'import { A } from "three";',
        },
        "postprocessing": {"build/index.js": b'import { B } from "three";'},
        "gsap": {
            "index.js": b'import { g } from "./gsap-core.js";',
            "gsap-core.js": b"export const g = 1;",
            "ScrollTrigger.js": b'import { O } from "./Observer.js";',
            "Observer.js": b"export const O = 1;",
            "SplitText.js": b"export const S = 1;",
        },
        "lenis": {"dist/lenis.mjs": b"export default class Lenis {}"},
        "htmx.org": {"dist/htmx.min.js": b"var htmx = {};"},
    }
    monkeypatch.setattr(gen, "fetch_package", lambda pkg: fake[pkg.name])
    js = tmp_path / "js"
    js.mkdir()
    (js / "main.js").write_text(
        'import { OrbitControls } from "three/addons/controls/OrbitControls.js";\n'
        'import "./core/motion.js";\n'
    )
    result, errors = gen.generate(js)
    assert errors == []
    integrity = result["integrity"]
    assert isinstance(integrity, dict)
    base = "https://cdn.jsdelivr.net/npm/"
    assert set(integrity) == {
        base + "three@0.186.1/build/three.module.js",
        base + "three@0.186.1/build/three.core.js",
        base + "three@0.186.1/examples/jsm/controls/OrbitControls.js",
        base + "postprocessing@6.39.5/build/index.js",
        base + "gsap@3.15.0/index.js",
        base + "gsap@3.15.0/gsap-core.js",
        base + "gsap@3.15.0/ScrollTrigger.js",
        base + "gsap@3.15.0/Observer.js",
        base + "gsap@3.15.0/SplitText.js",
        base + "lenis@1.3.27/dist/lenis.mjs",
    }
    digest = base64.b64encode(hashlib.sha384(b"export const g = 1;").digest()).decode()
    assert integrity[base + "gsap@3.15.0/gsap-core.js"] == f"sha384-{digest}"


def test_graph_walk_reports_unmapped_imports(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    files = {
        "build/three.module.js": b'import "./three.core.js";',
        "build/three.core.js": b"",
        "build/index.js": b'import "left-pad";',
        "index.js": b"",
        "ScrollTrigger.js": b"",
        "SplitText.js": b"",
        "dist/lenis.mjs": b"",
        "dist/htmx.min.js": b"",
    }
    monkeypatch.setattr(gen, "fetch_package", lambda pkg: files)
    js = tmp_path / "js"
    js.mkdir()
    (js / "main.js").write_text('import x from "split-type";')
    _, errors = gen.generate(js)
    assert any("left-pad" in e for e in errors)
    assert any("split-type" in e for e in errors)
