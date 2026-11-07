from __future__ import annotations

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.assets import AssetResolver, Manifest, build, is_hashed_url
from app.main import create_app
from app.settings import Settings


@pytest.fixture
def static_dir(tmp_path: Path) -> Path:
    root = tmp_path / "static"
    (root / "js" / "core").mkdir(parents=True)
    (root / "js" / "main.js").write_text('import { motionAllowed } from "./core/motion.js";\n')
    (root / "js" / "core" / "motion.js").write_text("export const motionAllowed = () => true;\n")
    (root / "shaders").mkdir()
    (root / "shaders" / "field.frag").write_text("void main() {}\n")
    (root / "fonts").mkdir()
    (root / "fonts" / "mona-sans.woff2").write_bytes(b"wOF2fake")
    (root / "dist").mkdir()
    (root / "dist" / "app.css").write_text("@font-face{src:url(../fonts/mona-sans.woff2)}")
    return root


def test_build_writes_hashed_tree_and_manifest(static_dir: Path) -> None:
    manifest = build(static_dir)
    tree = static_dir / "dist" / manifest.hash
    assert is_hashed_url(manifest.base + "js/main.js")
    for logical in ("js/main.js", "js/core/motion.js", "shaders/field.frag", "css/app.css"):
        assert (tree / logical).is_file()
        assert manifest.files[logical] == f"/static/dist/{manifest.hash}/{logical}"
    assert manifest.files["dist/app.css"] == manifest.files["css/app.css"]
    on_disk = json.loads((static_dir / "dist" / "manifest.json").read_text())
    assert on_disk["hash"] == manifest.hash
    assert Manifest.load(static_dir / "dist" / "manifest.json") == manifest


def test_relative_imports_survive(static_dir: Path) -> None:
    """main.js's ./core/motion.js and the CSS's ../fonts/ resolve inside the hashed tree."""
    manifest = build(static_dir)
    tree = static_dir / "dist" / manifest.hash
    main = tree / "js" / "main.js"
    assert "./core/motion.js" in main.read_text()
    assert (main.parent / "core" / "motion.js").is_file()
    css = tree / "css" / "app.css"
    assert (css.parent / "../fonts/mona-sans.woff2").resolve().is_file()


def test_hash_tracks_content(static_dir: Path) -> None:
    first = build(static_dir)
    assert build(static_dir).hash == first.hash  # deterministic
    (static_dir / "js" / "core" / "motion.js").write_text("export const motionAllowed = () => 0;")
    second = build(static_dir)
    assert second.hash != first.hash
    assert not (static_dir / "dist" / first.hash).exists()  # old build cleaned up
    assert (static_dir / "dist" / "app.css").is_file()  # dev output kept


def test_resolver_dev_and_prod(static_dir: Path) -> None:
    manifest = build(static_dir)
    dev = AssetResolver(manifest, hashed=False)
    assert dev("js/main.js") == "/static/js/main.js"
    assert dev("css/app.css") == "/static/dist/app.css"
    assert dev("/static/fonts/mona-sans.woff2") == "/static/fonts/mona-sans.woff2"
    prod = AssetResolver(manifest, hashed=True)
    assert prod("js/main.js") == manifest.base + "js/main.js"
    assert prod("css/app.css") == manifest.base + "css/app.css"
    assert prod("img/unknown.png") == "/static/img/unknown.png"
    missing = AssetResolver(None, hashed=True)
    assert missing("js/main.js") == "/static/js/main.js"


def test_manifest_load_tolerates_missing_or_bad(tmp_path: Path) -> None:
    assert Manifest.load(tmp_path / "missing.json") is None
    (tmp_path / "bad.json").write_text("{")
    assert Manifest.load(tmp_path / "bad.json") is None


def test_is_hashed_url() -> None:
    assert is_hashed_url("/static/dist/0123456789ab/js/main.js")
    assert not is_hashed_url("/static/dist/app.css")
    assert not is_hashed_url("/static/js/main.js")
    assert not is_hashed_url("/static/dist/not-a-hash-xx/js/main.js")


def test_prod_app_serves_hashed_assets_immutable(static_dir: Path, tmp_path: Path) -> None:
    manifest = build(static_dir)
    templates = tmp_path / "templates" / "pages"
    templates.mkdir(parents=True)
    (templates / "home.html").write_text(
        "<script type=module src=\"{{ asset('js/main.js') }}\"></script>"
    )
    app = create_app(Settings(env="prod"), templates_dir=templates.parent, static_dir=static_dir)
    with TestClient(app) as c:
        page = c.get("/")
        assert manifest.files["js/main.js"] in page.text
        assert page.headers["cache-control"] == "no-cache"
        res = c.get(manifest.files["js/core/motion.js"])
        assert res.status_code == 200
        assert res.headers["cache-control"] == "public, max-age=31536000, immutable"
        assert res.headers["content-type"].startswith(("text/javascript", "application/javascript"))
        plain = c.get("/static/js/main.js")
        assert plain.headers["cache-control"] == "no-cache"
        missing = c.get(manifest.base + "js/nope.js")
        assert missing.status_code == 404
        assert "immutable" not in missing.headers["cache-control"]
