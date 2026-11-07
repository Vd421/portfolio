"""Smoke tests against the real templates in templates/ (skipped until they exist)."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.content import get_content
from app.main import TEMPLATES_DIR, create_app
from app.settings import Settings

pages = TEMPLATES_DIR / "pages"
needs = pytest.mark.skipif(
    not all((pages / f"{n}.html").is_file() for n in ("home", "work", "replay", "404")),
    reason="templates/pages/*.html not written yet",
)


@pytest.fixture
def client() -> TestClient:
    return TestClient(create_app(Settings()))


@needs
def test_real_home(client: TestClient) -> None:
    res = client.get("/")
    assert res.status_code == 200
    assert '<script type="importmap"' in res.text
    assert 'id="main"' in res.text


@needs
@pytest.mark.parametrize("slug", [p.slug for p in get_content().projects])
def test_real_project_pages(client: TestClient, slug: str) -> None:
    assert client.get(f"/work/{slug}").status_code == 200


@needs
def test_real_404(client: TestClient) -> None:
    res = client.get("/definitely-missing")
    assert res.status_code == 404
    assert 'data-page="404"' in res.text
