"""Typed site content, loaded from /content YAML and validated at startup.

Unknown facts are written as strings starting with ``TODO`` (or left ``None``).
Templates render TODO strings as visible placeholders, and ``Content.todos()``
lists every one of them so nothing invented ever ships silently.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any, Literal

import yaml
from pydantic import BaseModel, ConfigDict, Field, model_validator

CONTENT_DIR = Path(__file__).resolve().parent.parent / "content"
TODO_PREFIX = "TODO"


def is_todo(value: object) -> bool:
    """True for a placeholder string such as ``"TODO: link to demo"``."""
    return isinstance(value, str) and value.strip().upper().startswith(TODO_PREFIX)


class Model(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class Link(Model):
    label: str
    href: str  # a URL, or a TODO placeholder
    kind: Literal["repo", "live", "demo", "doc", "social", "mail", "other"] = "other"

    @property
    def is_placeholder(self) -> bool:
        return is_todo(self.href)


class Media(Model):
    kind: Literal["image", "video"] = "image"
    src: str  # path under /static, or a TODO placeholder
    alt: str
    caption: str | None = None
    width: int | None = None
    height: int | None = None

    @property
    def is_placeholder(self) -> bool:
        return is_todo(self.src)


class Highlight(Model):
    """A claim or metric. ``verified: false`` means it is carried over and needs confirming."""

    label: str
    value: str
    verified: bool = False


class Flag(Model):
    """An "AI bug detected" annotation in the Replay case study."""

    severity: Literal["error", "warning"]
    label: str
    detail: str


class Chapter(Model):
    id: str
    at: int = Field(ge=0, description="Playhead position in seconds")
    title: str
    body: list[str]
    flag: Flag | None = None


class CaseStudy(Model):
    duration: int = Field(gt=0, description="Total replay length in seconds")
    intro: str
    chapters: list[Chapter]

    @model_validator(mode="after")
    def _chapters_in_order(self) -> CaseStudy:
        times = [c.at for c in self.chapters]
        if times != sorted(times):
            raise ValueError("case study chapters must be ordered by `at`")
        if times and times[-1] > self.duration:
            raise ValueError("a chapter starts after the replay ends")
        if len({c.id for c in self.chapters}) != len(self.chapters):
            raise ValueError("chapter ids must be unique")
        return self


class Project(Model):
    slug: str = Field(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    title: str
    kicker: str
    summary: str
    description: list[str] = []
    year: str | None = None
    role: str | None = None
    category: Literal["ai", "cv", "embedded", "web"]
    stack: list[str] = []
    links: list[Link] = []
    highlights: list[Highlight] = []
    media: list[Media] = []
    featured: bool = False
    order: int = 100
    case_study: CaseStudy | None = None


class Role(Model):
    company: str
    client: str | None = None
    title: str
    kind: Literal["full-time", "internship"]
    start: str
    end: str | None = None  # None means present
    location: str | None = None
    summary: str
    highlights: list[Highlight] = []
    stack: list[str] = []


class Education(Model):
    degree: str
    field: str | None = None
    institution: str
    start: str | None = None
    end: str | None = None


class SkillGroup(Model):
    name: str
    items: list[str]


class Site(Model):
    name: str
    handle: str
    roles: list[str]
    tagline: str
    about: list[str]
    location: str
    email: str
    availability: str
    links: list[Link]
    resume: Link
    education: list[Education]


class Content(Model):
    site: Site
    projects: list[Project]
    experience: list[Role]
    skills: list[SkillGroup]

    @model_validator(mode="after")
    def _unique_slugs(self) -> Content:
        slugs = [p.slug for p in self.projects]
        if len(set(slugs)) != len(slugs):
            raise ValueError("project slugs must be unique")
        return self

    @property
    def projects_ordered(self) -> list[Project]:
        return sorted(self.projects, key=lambda p: (p.order, p.title))

    @property
    def featured(self) -> Project | None:
        return next((p for p in self.projects_ordered if p.featured), None)

    def project(self, slug: str) -> Project | None:
        return next((p for p in self.projects if p.slug == slug), None)

    def todos(self) -> list[str]:
        """Every placeholder and unverified claim, as "path: value" lines."""
        found: list[str] = []

        def walk(node: Any, path: str) -> None:
            if isinstance(node, BaseModel):
                if isinstance(node, Highlight) and not node.verified:
                    found.append(f"{path}: unverified claim '{node.label}: {node.value}'")
                for name in type(node).model_fields:
                    walk(getattr(node, name), f"{path}.{name}" if path else name)
            elif isinstance(node, list):
                for i, item in enumerate(node):
                    walk(item, f"{path}[{i}]")
            elif is_todo(node):
                found.append(f"{path}: {node}")

        walk(self, "")
        return found


def _read_yaml(path: Path) -> Any:
    with path.open(encoding="utf-8") as fh:
        return yaml.safe_load(fh)


def load_content(directory: Path = CONTENT_DIR) -> Content:
    projects = [_read_yaml(p) for p in sorted((directory / "projects").glob("*.yaml"))]
    return Content.model_validate(
        {
            "site": _read_yaml(directory / "site.yaml"),
            "projects": projects,
            "experience": _read_yaml(directory / "experience.yaml"),
            "skills": _read_yaml(directory / "skills.yaml"),
        }
    )


@lru_cache(maxsize=1)
def get_content() -> Content:
    return load_content()
