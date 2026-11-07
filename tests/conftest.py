"""Shared fixtures.

Page tests run against tiny stand-in templates so the platform is tested on its
own; ``test_real_templates.py`` covers the real ones once they exist.
"""

from __future__ import annotations

import json
from collections.abc import AsyncIterator, Callable, Iterator
from pathlib import Path
from types import SimpleNamespace
from typing import Any

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.content import Content, get_content
from app.main import create_app
from app.settings import Settings

PAGE = """<!doctype html><html><head><title>{{ page }}</title>{{ import_map() }}
<link rel="stylesheet" href="{{ asset('css/app.css') }}"></head>
<body><main id="main" data-page="{{ page }}">
<p id="name">{{ site.name }}</p><p id="ask">{{ ask_enabled }}</p>
<p id="hud-build" data-hud="build">{{ status.build }}</p>
<p id="hud-ask" data-hud="ask">{{ status.ask }}</p>
{% if project %}<h1>{{ project.title }}</h1>{% endif %}
{% if site.availability is todo %}<p id="todo">placeholder</p>{% endif %}
<script type="module" src="{{ asset('js/main.js') }}"></script>
</main></body></html>
"""


@pytest.fixture
def templates_dir(tmp_path: Path) -> Path:
    pages = tmp_path / "templates" / "pages"
    pages.mkdir(parents=True)
    for name in ("home", "work", "replay", "404"):
        (pages / f"{name}.html").write_text(PAGE.replace("<title>", f"<title>{name} "))
    return tmp_path / "templates"


@pytest.fixture
def content() -> Content:
    return get_content()


class _TextStream:
    def __init__(self, chunks: list[str]) -> None:
        self.chunks = chunks

    def __aiter__(self) -> AsyncIterator[str]:
        return self._gen()

    async def _gen(self) -> AsyncIterator[str]:
        for chunk in self.chunks:
            yield chunk


class FakeClient:
    """Stands in for anthropic.AsyncAnthropic: records each stream() call."""

    def __init__(self) -> None:
        self.calls: list[dict[str, Any]] = []
        self.chunks = ["Replay records ", "user sessions."]
        self.stop_reason = "end_turn"
        self.stop_details: Any = None
        self.error: Exception | None = None
        self.beta = SimpleNamespace(messages=SimpleNamespace(stream=self._stream))

    def _stream(self, **kwargs: Any) -> Any:
        self.calls.append(kwargs)
        if self.error is not None:
            raise self.error
        stream = SimpleNamespace(
            text_stream=_TextStream(self.chunks),
            get_final_message=self._final,
        )
        return _Ctx(stream)

    async def _final(self) -> Any:
        return SimpleNamespace(stop_reason=self.stop_reason, stop_details=self.stop_details)


class _Ctx:
    def __init__(self, stream: Any) -> None:
        self.stream = stream

    async def __aenter__(self) -> Any:
        return self.stream

    async def __aexit__(self, *exc: object) -> None:
        return None


@pytest.fixture
def fake_client() -> FakeClient:
    return FakeClient()


AppFactory = Callable[..., FastAPI]


@pytest.fixture
def make_app(templates_dir: Path, fake_client: FakeClient, tmp_path: Path) -> AppFactory:
    def factory(**settings: Any) -> FastAPI:
        return create_app(
            Settings(**settings),
            templates_dir=templates_dir,
            manifest_path=tmp_path / "no-manifest.json",
            client_factory=lambda _s: fake_client,  # type: ignore[arg-type,return-value]
        )

    return factory


@pytest.fixture
def client(make_app: AppFactory) -> Iterator[TestClient]:
    with TestClient(make_app()) as c:
        yield c


def parse_sse(body: str) -> list[tuple[str, dict[str, Any]]]:
    events: list[tuple[str, dict[str, Any]]] = []
    for block in body.strip().split("\n\n"):
        lines = dict(line.split(": ", 1) for line in block.splitlines())
        events.append((lines["event"], json.loads(lines["data"])))
    return events
