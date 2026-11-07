from __future__ import annotations

import logging
from types import SimpleNamespace

import anthropic
import httpx2
import pytest
from fastapi.testclient import TestClient

from app.ask import (
    FALLBACK_BETA,
    AskRequest,
    SlidingWindowLimiter,
    Turn,
    build_messages,
    client_ip,
    content_data,
    system_prompt,
)
from app.content import Content
from app.settings import Rate
from tests.conftest import AppFactory, FakeClient, parse_sse

KEY = "sk-ant-test-key-do-not-log"
REQ = httpx2.Request("POST", "https://api.anthropic.com/v1/messages")


def online(make_app: AppFactory, **settings: object) -> TestClient:
    return TestClient(make_app(anthropic_api_key=KEY, **settings))


def test_offline_without_key(client: TestClient) -> None:
    res = client.post("/api/ask", json={"question": "What is Replay?"})
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/event-stream")
    events = parse_sse(res.text)
    assert len(events) == 1
    name, data = events[0]
    assert name == "error"
    assert data["code"] == "offline"
    assert "help" in data["message"]


@pytest.mark.parametrize(
    "body",
    [
        {"question": ""},
        {"question": "x" * 501},
        {},
        {"question": "hi", "history": [{"role": "user", "content": "a"}] * 7},
        {"question": "hi", "history": [{"role": "system", "content": "a"}]},
        {"question": "hi", "extra": True},
        {"question": 5},
    ],
)
def test_invalid_requests(make_app: AppFactory, body: object) -> None:
    with online(make_app) as c:
        res = c.post("/api/ask", json=body)
    assert res.status_code == 422
    events = parse_sse(res.text)
    assert [e[0] for e in events] == ["error"]
    assert events[0][1]["code"] == "invalid"


def test_non_json_body_is_invalid(make_app: AppFactory) -> None:
    with online(make_app) as c:
        res = c.post("/api/ask", content=b"not json", headers={"content-type": "text/plain"})
    assert res.status_code == 422
    assert parse_sse(res.text)[0][1]["code"] == "invalid"


def test_oversized_body_is_invalid(make_app: AppFactory) -> None:
    with online(make_app) as c:
        res = c.post("/api/ask", content=b"x" * 20_000)
    assert res.status_code == 413
    assert parse_sse(res.text)[0][1]["code"] == "invalid"


def test_question_limits_are_inclusive() -> None:
    AskRequest(question="x")
    AskRequest(question="x" * 500, history=[Turn(role="user", content="a")] * 6)


def test_streams_tokens_then_done(make_app: AppFactory, fake_client: FakeClient) -> None:
    with online(make_app) as c:
        res = c.post("/api/ask", json={"question": "What is Replay?"})
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/event-stream")
    events = parse_sse(res.text)
    assert events == [
        ("token", {"text": "Replay records "}),
        ("token", {"text": "user sessions."}),
        ("done", {"stop_reason": "end_turn"}),
    ]


def test_request_shape(make_app: AppFactory, fake_client: FakeClient, content: Content) -> None:
    history = [
        {"role": "assistant", "content": "Hi, ask me anything."},
        {"role": "user", "content": "Who is vd?"},
        {"role": "assistant", "content": "Vaibhav Dhir."},
    ]
    with online(make_app) as c:
        c.post("/api/ask", json={"question": "What is Replay?", "history": history})
    (call,) = fake_client.calls
    assert call["model"] == "claude-opus-5-5"
    assert call["output_config"] == {"effort": "low"}
    assert call["fallbacks"] == "default"
    assert call["betas"] == [FALLBACK_BETA] == ["server-side-fallback-2026-07-01"]
    assert "thinking" not in call
    assert 0 < call["max_tokens"] <= 4096
    # Leading assistant turn dropped; question appended last.
    assert call["messages"] == [
        {"role": "user", "content": "Who is vd?"},
        {"role": "assistant", "content": "Vaibhav Dhir."},
        {"role": "user", "content": "What is Replay?"},
    ]
    (block,) = call["system"]
    assert block["cache_control"] == {"type": "ephemeral"}
    text = block["text"]
    assert content.site.name in text
    assert content.site.email in text
    assert "Soccer Player Tracker" in text
    assert "YOLOv8" in text
    assert "TODO" not in text


def test_system_prompt_has_no_placeholders(content: Content) -> None:
    prompt = system_prompt(content)
    assert "todo" not in prompt.lower()
    # Placeholder links are dropped entirely, real ones kept, whatever the content holds.
    links = [*content.site.links, content.site.resume]
    links += [link for p in content.projects for link in p.links]
    assert any(not link.is_placeholder for link in links)
    for link in links:
        if link.is_placeholder:
            assert link.href not in prompt
        else:
            assert link.href in prompt


def test_system_prompt_labels_unverified_claims(content: Content) -> None:
    data = content_data(content)
    blind = next(p for p in data["projects"] if p["slug"] == "ai-blind-stick")
    assert blind["highlights"] == [
        {"label": "Obstacle detection accuracy", "value": "90%", "verified": False}
    ]
    assert '"verified": false' in system_prompt(content)


def test_system_prompt_is_deterministic(content: Content) -> None:
    assert system_prompt(content) == system_prompt(content.model_copy(deep=True))


def test_refusal_becomes_error(make_app: AppFactory, fake_client: FakeClient) -> None:
    fake_client.chunks = ["Partial "]
    fake_client.stop_reason = "refusal"
    fake_client.stop_details = SimpleNamespace(category="cyber", explanation=None)
    with online(make_app) as c:
        events = parse_sse(c.post("/api/ask", json={"question": "hm"}).text)
    assert events[0] == ("token", {"text": "Partial "})
    assert events[-1][0] == "error"
    assert events[-1][1]["code"] == "upstream"
    assert all(name != "done" for name, _ in events)


def test_max_tokens_stop_reason_passes_through(
    make_app: AppFactory, fake_client: FakeClient
) -> None:
    fake_client.stop_reason = "max_tokens"
    with online(make_app) as c:
        events = parse_sse(c.post("/api/ask", json={"question": "hm"}).text)
    assert events[-1] == ("done", {"stop_reason": "max_tokens"})


@pytest.mark.parametrize(
    ("error", "code"),
    [
        (
            anthropic.RateLimitError(
                "slow down", response=httpx2.Response(429, request=REQ), body=None
            ),
            "rate_limited",
        ),
        (
            anthropic.InternalServerError(
                "boom", response=httpx2.Response(500, request=REQ), body=None
            ),
            "upstream",
        ),
        (
            anthropic.AuthenticationError(
                "bad key", response=httpx2.Response(401, request=REQ), body=None
            ),
            "upstream",
        ),
        (anthropic.APIConnectionError(request=REQ), "upstream"),
        (anthropic.APITimeoutError(request=REQ), "upstream"),
    ],
)
def test_upstream_errors(
    make_app: AppFactory,
    fake_client: FakeClient,
    error: Exception,
    code: str,
    caplog: pytest.LogCaptureFixture,
) -> None:
    fake_client.error = error
    app = make_app(anthropic_api_key=KEY)
    with caplog.at_level(logging.DEBUG), TestClient(app) as c:
        events = parse_sse(c.post("/api/ask", json={"question": "hm"}).text)
    assert len(events) == 1
    assert events[0][0] == "error"
    assert events[0][1]["code"] == code
    assert events[0][1]["message"]
    assert KEY not in caplog.text
    assert app.state.asker.health.degraded


def test_rate_limit_per_ip(make_app: AppFactory) -> None:
    with online(make_app, ask_rate="2/600") as c:
        a = {"x-forwarded-for": "10.9.9.9, 203.0.113.5"}
        b = {"x-forwarded-for": "198.51.100.7"}
        assert c.post("/api/ask", json={"question": "1"}, headers=a).status_code == 200
        assert c.post("/api/ask", json={"question": "2"}, headers=a).status_code == 200
        res = c.post("/api/ask", json={"question": "3"}, headers=a)
        assert res.status_code == 429
        assert res.headers["content-type"].startswith("application/json")
        assert int(res.headers["retry-after"]) > 0
        body = res.json()
        assert body["code"] == "rate_limited"
        assert body["message"]
        # A different client is unaffected.
        assert c.post("/api/ask", json={"question": "4"}, headers=b).status_code == 200


def test_global_rate_limit(make_app: AppFactory) -> None:
    with online(make_app, ask_global_rate="2/600") as c:
        for ip in ("192.0.2.1", "192.0.2.2"):
            res = c.post("/api/ask", json={"question": "q"}, headers={"x-forwarded-for": ip})
            assert res.status_code == 200
        res = c.post("/api/ask", json={"question": "q"}, headers={"x-forwarded-for": "192.0.2.3"})
        assert res.status_code == 429


def test_invalid_requests_do_not_spend_rate_limit(make_app: AppFactory) -> None:
    with online(make_app, ask_rate="1/600") as c:
        for _ in range(3):
            c.post("/api/ask", json={"question": ""})
        assert c.post("/api/ask", json={"question": "ok"}).status_code == 200


def test_sliding_window_frees_slots() -> None:
    now = [1000.0]
    limiter = SlidingWindowLimiter(Rate(limit=2, window_s=10), clock=lambda: now[0])
    assert limiter.hit("a") is None
    now[0] += 5
    assert limiter.hit("a") is None
    wait = limiter.hit("a")
    assert wait is not None and 0 < wait <= 5
    now[0] += 5.1  # first hit has left the window
    assert limiter.hit("a") is None


def test_client_ip() -> None:
    # The last entry is the one the proxy appended; earlier ones are client-supplied.
    assert client_ip({"x-forwarded-for": "1.2.3.4, 10.0.0.1"}, "10.0.0.9") == "10.0.0.1"
    assert client_ip({"x-forwarded-for": "6.6.6.6, 203.0.113.5"}, None) == "203.0.113.5"
    assert client_ip({}, "10.0.0.9") == "10.0.0.9"
    assert client_ip({"x-forwarded-for": " "}, None) == "unknown"


def test_build_messages_without_history() -> None:
    assert build_messages(AskRequest(question="hi")) == [{"role": "user", "content": "hi"}]
