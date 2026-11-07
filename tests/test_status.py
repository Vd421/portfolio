from __future__ import annotations

from datetime import datetime

from fastapi.testclient import TestClient

from tests.conftest import AppFactory


def test_healthz(client: TestClient) -> None:
    res = client.get("/healthz")
    assert res.status_code == 200
    assert res.json() == {"ok": True}


def test_status_shape(client: TestClient) -> None:
    data = client.get("/api/status").json()
    assert set(data) == {
        "status",
        "uptime_s",
        "build",
        "region",
        "python",
        "server_time",
        "ask",
    }
    assert data["status"] == "nominal"
    assert isinstance(data["uptime_s"], int) and data["uptime_s"] >= 0
    assert data["build"] == "local"
    assert data["region"] == "local"
    assert data["python"].startswith("3.12")
    assert data["server_time"].endswith("Z")
    datetime.strptime(data["server_time"], "%Y-%m-%dT%H:%M:%SZ")
    assert data["ask"] == "offline"


def test_status_reflects_env(make_app: AppFactory) -> None:
    app = make_app(anthropic_api_key="sk-test", build="a1b2c3d", region="oregon")
    with TestClient(app) as c:
        data = c.get("/api/status").json()
    assert data["build"] == "a1b2c3d"
    assert data["region"] == "oregon"
    assert data["ask"] == "online"


def test_status_degraded_after_upstream_failure(make_app: AppFactory) -> None:
    app = make_app(anthropic_api_key="sk-test")
    app.state.asker.health.failed()
    with TestClient(app) as c:
        assert c.get("/api/status").json()["status"] == "degraded"
    app.state.asker.health.ok()
    with TestClient(app) as c:
        assert c.get("/api/status").json()["status"] == "nominal"
