from __future__ import annotations

import re
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.content import Content, get_content
from app.main import create_app
from app.settings import Settings
from tests.conftest import AppFactory


def test_home(client: TestClient, content: Content) -> None:
    res = client.get("/")
    assert res.status_code == 200
    assert 'data-page="home"' in res.text
    assert content.site.name in res.text


@pytest.mark.parametrize("slug", [p.slug for p in get_content().projects])
def test_every_project_page(client: TestClient, content: Content, slug: str) -> None:
    project = content.project(slug)
    assert project is not None
    res = client.get(f"/work/{slug}")
    assert res.status_code == 200
    assert 'data-page="work"' in res.text
    expected = "replay" if project.case_study else "work"
    assert f"<title>{expected} " in res.text


def test_unknown_project_is_404(client: TestClient) -> None:
    res = client.get("/work/not-a-project")
    assert res.status_code == 404
    assert 'data-page="404"' in res.text


def test_unknown_path_renders_404_page(client: TestClient) -> None:
    res = client.get("/nope/nothing-here")
    assert res.status_code == 404
    assert res.headers["content-type"].startswith("text/html")
    assert 'data-page="404"' in res.text


def test_404_falls_back_without_template(tmp_path: Path) -> None:
    (tmp_path / "pages").mkdir()
    app = create_app(Settings(), templates_dir=tmp_path)
    with TestClient(app) as c:
        res = c.get("/missing")
    assert res.status_code == 404
    assert "Page not found" in res.text
    assert '<a href="/">' in res.text


def test_context_has_status_and_ask_flag(client: TestClient) -> None:
    res = client.get("/")
    assert '<p id="ask">False</p>' in res.text
    assert '<p id="hud-build" data-hud="build">local</p>' in res.text
    assert '<p id="hud-ask" data-hud="ask">offline</p>' in res.text


def test_ask_enabled_when_key_set(make_app: AppFactory) -> None:
    with TestClient(make_app(anthropic_api_key="sk-test")) as c:
        res = c.get("/")
    assert '<p id="ask">True</p>' in res.text
    assert '<p id="hud-ask" data-hud="ask">online</p>' in res.text


def test_todo_jinja_test(client: TestClient, content: Content) -> None:
    # site.availability is a TODO placeholder in /content today.
    shows = 'id="todo"' in client.get("/").text
    assert shows == content.site.availability.upper().startswith("TODO")


def test_security_headers_and_nonce(client: TestClient) -> None:
    res = client.get("/")
    csp = res.headers["content-security-policy"]
    nonce = re.search(r"'nonce-([^']+)'", csp)
    assert nonce is not None
    assert f'<script type="importmap" nonce="{nonce.group(1)}">' in res.text
    assert "https://cdn.jsdelivr.net" in csp
    assert "object-src 'none'" in csp
    assert "frame-ancestors 'none'" in csp
    assert res.headers["x-content-type-options"] == "nosniff"
    assert res.headers["referrer-policy"] == "strict-origin-when-cross-origin"
    assert "camera=()" in res.headers["permissions-policy"]
    assert res.headers["cache-control"] == "no-cache"
    assert "strict-transport-security" not in res.headers


def test_nonce_differs_per_request(client: TestClient) -> None:
    a = client.get("/").headers["content-security-policy"]
    b = client.get("/").headers["content-security-policy"]
    assert a != b


def test_hsts_in_prod(make_app: AppFactory) -> None:
    with TestClient(make_app(env="prod")) as c:
        assert "max-age" in c.get("/healthz").headers["strict-transport-security"]


def test_gzip(client: TestClient) -> None:
    res = client.get("/", headers={"Accept-Encoding": "gzip"})
    assert res.headers.get("content-encoding") == "gzip"


def test_dev_assets_are_unhashed(client: TestClient) -> None:
    text = client.get("/").text
    assert 'href="/static/dist/app.css"' in text
    assert 'src="/static/js/main.js"' in text
