"""Runtime settings, read from environment variables.

Plain pydantic (no pydantic-settings dependency). ``get_settings()`` reads the
process environment once; tests build ``Settings`` directly.
"""

from __future__ import annotations

import os
from collections.abc import Mapping
from functools import lru_cache
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, SecretStr, field_validator


class Rate(BaseModel):
    """``limit`` requests per ``window_s`` seconds, written as ``"8/600"``."""

    model_config = ConfigDict(frozen=True)

    limit: int = Field(gt=0)
    window_s: int = Field(gt=0)

    @classmethod
    def parse(cls, raw: str) -> Rate:
        try:
            limit, window = raw.split("/", 1)
            return cls(limit=int(limit), window_s=int(window))
        except ValueError as exc:
            raise ValueError(f"expected a rate like '8/600', got {raw!r}") from exc


class Settings(BaseModel):
    model_config = ConfigDict(frozen=True)

    env: Literal["dev", "prod"] = "dev"
    anthropic_api_key: SecretStr | None = None
    ask_model: str = "claude-opus-5-5"
    ask_rate: Rate = Rate(limit=8, window_s=600)
    # Safety net across every visitor, so one spoofed header can't run up the bill.
    ask_global_rate: Rate = Rate(limit=200, window_s=3600)
    ask_max_tokens: int = Field(default=2048, gt=0, le=8192)
    build: str = "local"
    region: str = "local"
    # Public origin for canonical and Open Graph URLs, e.g. "https://vd.onrender.com".
    site_url: str | None = None

    @field_validator("ask_rate", "ask_global_rate", mode="before")
    @classmethod
    def _parse_rate(cls, value: object) -> object:
        return Rate.parse(value) if isinstance(value, str) else value

    @field_validator("anthropic_api_key", mode="before")
    @classmethod
    def _blank_key_is_none(cls, value: object) -> object:
        if isinstance(value, str) and not value.strip():
            return None
        return value

    @property
    def is_prod(self) -> bool:
        return self.env == "prod"

    @property
    def ask_enabled(self) -> bool:
        return self.anthropic_api_key is not None

    @classmethod
    def from_env(cls, environ: Mapping[str, str] | None = None) -> Settings:
        env = os.environ if environ is None else environ
        values: dict[str, object] = {
            # On Render the RENDER variable is always set, so default to prod there.
            "env": env.get("ENV") or ("prod" if env.get("RENDER") else "dev"),
            "anthropic_api_key": env.get("ANTHROPIC_API_KEY"),
            "build": (env.get("RENDER_GIT_COMMIT") or "local")[:7],
            "region": env.get("RENDER_REGION") or "local",
            "site_url": (env.get("SITE_URL") or env.get("RENDER_EXTERNAL_URL") or "").rstrip("/")
            or None,
        }
        optional = {
            "ask_model": "ASK_MODEL",
            "ask_rate": "ASK_RATE",
            "ask_global_rate": "ASK_GLOBAL_RATE",
            "ask_max_tokens": "ASK_MAX_TOKENS",
        }
        for field, name in optional.items():
            if env.get(name):
                values[field] = env[name]
        return cls.model_validate(values)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings.from_env()
