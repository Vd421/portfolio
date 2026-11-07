from __future__ import annotations

import shutil
from pathlib import Path

import pytest
import yaml
from pydantic import ValidationError

from app.content import CONTENT_DIR, Content, is_todo, load_content


@pytest.fixture
def content_dir(tmp_path: Path) -> Path:
    target = tmp_path / "content"
    shutil.copytree(CONTENT_DIR, target)
    return target


def edit(path: Path, change: object) -> None:
    data = yaml.safe_load(path.read_text())
    assert callable(change)
    change(data)
    path.write_text(yaml.safe_dump(data, sort_keys=False))


def test_real_content_loads() -> None:
    content = load_content()
    assert content.site.name == "Vaibhav Dhir"
    assert content.projects
    assert content.featured is not None
    orders = [p.order for p in content.projects_ordered]
    assert orders == sorted(orders)


def test_project_lookup() -> None:
    content = load_content()
    first = content.projects[0]
    assert content.project(first.slug) == first
    assert content.project("does-not-exist") is None


def test_is_todo() -> None:
    assert is_todo("TODO: something")
    assert is_todo("  todo later")
    assert not is_todo("Done")
    assert not is_todo(None)
    assert not is_todo(42)


def test_todos_lists_placeholders_and_unverified_claims() -> None:
    todos = load_content().todos()
    assert todos
    assert any(line.startswith("site.availability: TODO") for line in todos)
    assert any("unverified claim" in line for line in todos)


def test_todos_empty_for_complete_content(content_dir: Path) -> None:
    content = load_content(content_dir)
    cleaned = content.model_copy(update={"projects": [], "experience": [], "skills": []})
    site = cleaned.site.model_copy(
        update={
            "about": ["Writes software."],
            "availability": "Open to roles",
            "links": [],
            "resume": cleaned.site.resume.model_copy(update={"href": "/static/cv.pdf"}),
        }
    )
    assert cleaned.model_copy(update={"site": site}).todos() == []


def test_unknown_field_rejected(content_dir: Path) -> None:
    edit(content_dir / "site.yaml", lambda d: d.update(nickname="x"))
    with pytest.raises(ValidationError, match="nickname"):
        load_content(content_dir)


def test_bad_slug_rejected(content_dir: Path) -> None:
    edit(content_dir / "projects" / "replay.yaml", lambda d: d.update(slug="Not A Slug"))
    with pytest.raises(ValidationError, match="slug"):
        load_content(content_dir)


def test_duplicate_slugs_rejected(content_dir: Path) -> None:
    src = content_dir / "projects" / "replay.yaml"
    shutil.copy(src, content_dir / "projects" / "zz-copy.yaml")
    with pytest.raises(ValidationError, match="unique"):
        load_content(content_dir)


def test_chapters_out_of_order_rejected(content_dir: Path) -> None:
    def swap(d: dict[str, object]) -> None:
        chapters = d["case_study"]["chapters"]  # type: ignore[index]
        chapters[0]["at"], chapters[1]["at"] = 50, 10

    edit(content_dir / "projects" / "replay.yaml", swap)
    with pytest.raises(ValidationError, match="ordered"):
        load_content(content_dir)


def test_chapter_after_end_rejected(content_dir: Path) -> None:
    edit(
        content_dir / "projects" / "replay.yaml",
        lambda d: d["case_study"].update(duration=100),
    )
    with pytest.raises(ValidationError, match="after the replay ends"):
        load_content(content_dir)


def test_duplicate_chapter_ids_rejected(content_dir: Path) -> None:
    def dup(d: dict[str, object]) -> None:
        chapters = d["case_study"]["chapters"]  # type: ignore[index]
        chapters[1]["id"] = chapters[0]["id"]

    edit(content_dir / "projects" / "replay.yaml", dup)
    with pytest.raises(ValidationError, match="unique"):
        load_content(content_dir)


def test_bad_enum_rejected(content_dir: Path) -> None:
    edit(content_dir / "projects" / "replay.yaml", lambda d: d.update(category="games"))
    with pytest.raises(ValidationError, match="category"):
        load_content(content_dir)


def test_malformed_yaml_raises(content_dir: Path) -> None:
    (content_dir / "skills.yaml").write_text("- name: [unclosed\n")
    with pytest.raises(yaml.YAMLError):
        load_content(content_dir)


def test_missing_file_raises(content_dir: Path) -> None:
    (content_dir / "experience.yaml").unlink()
    with pytest.raises(FileNotFoundError):
        load_content(content_dir)


def test_content_is_frozen() -> None:
    content: Content = load_content()
    with pytest.raises(ValidationError):
        content.site.name = "Someone else"  # type: ignore[misc]
