from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.settings import Rate, Settings


def test_defaults() -> None:
    s = Settings.from_env({})
    assert s.env == "dev"
    assert s.ask_model == "claude-opus-5-5"
    assert s.ask_rate == Rate(limit=8, window_s=600)
    assert s.anthropic_api_key is None
    assert not s.ask_enabled
    assert (s.build, s.region) == ("local", "local")


def test_from_env() -> None:
    s = Settings.from_env(
        {
            "ENV": "prod",
            "ANTHROPIC_API_KEY": "sk-ant-secret",
            "ASK_MODEL": "claude-sonnet-5-5",
            "ASK_RATE": "3/60",
            "RENDER_GIT_COMMIT": "a1b2c3d4e5f6a7b8",
            "RENDER_REGION": "oregon",
        }
    )
    assert s.is_prod
    assert s.ask_enabled
    assert s.ask_model == "claude-sonnet-5-5"
    assert s.ask_rate == Rate(limit=3, window_s=60)
    assert s.build == "a1b2c3d"
    assert s.region == "oregon"


def test_key_never_in_repr() -> None:
    s = Settings.from_env({"ANTHROPIC_API_KEY": "sk-ant-secret"})
    assert "sk-ant-secret" not in repr(s)
    assert "sk-ant-secret" not in str(s.model_dump())


def test_blank_key_means_offline() -> None:
    assert not Settings.from_env({"ANTHROPIC_API_KEY": "  "}).ask_enabled


def test_render_defaults_to_prod() -> None:
    assert Settings.from_env({"RENDER": "true"}).is_prod
    assert not Settings.from_env({"RENDER": "true", "ENV": "dev"}).is_prod


@pytest.mark.parametrize("raw", ["8", "a/b", "0/60", "8/0"])
def test_bad_rate(raw: str) -> None:
    with pytest.raises((ValidationError, ValueError)):
        Settings.from_env({"ASK_RATE": raw})


def test_bad_env() -> None:
    with pytest.raises(ValidationError):
        Settings.from_env({"ENV": "staging"})


def test_site_url() -> None:
    assert Settings.from_env({}).site_url is None
    render = {"RENDER_EXTERNAL_URL": "https://vd.onrender.com/"}
    assert Settings.from_env(render).site_url == "https://vd.onrender.com"
    both = {**render, "SITE_URL": "https://vaibhav.dev"}
    assert Settings.from_env(both).site_url == "https://vaibhav.dev"
