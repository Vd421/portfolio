from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
import todos


def test_todos_prints_checklist(capsys: pytest.CaptureFixture[str]) -> None:
    assert todos.main([]) == 0
    out = capsys.readouterr()
    assert "- [ ] site.availability: TODO" in out.out
    assert "item(s) left" in out.err


def test_todos_strict_fails_while_placeholders_remain() -> None:
    assert todos.main(["--strict"]) == 1
