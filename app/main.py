"""Application entry point.

Scaffold only: Engineer A owns hardening this (asset manifest, API routes,
rate limiting, error pages, settings). Page routes and the template context
shape are fixed by CONTRACTS.md.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app.content import Content, get_content, is_todo

ROOT = Path(__file__).resolve().parent.parent

app = FastAPI(title="vd", docs_url=None, redoc_url=None, openapi_url=None)
app.mount("/static", StaticFiles(directory=ROOT / "static"), name="static")

templates = Jinja2Templates(directory=ROOT / "templates")
templates.env.tests["todo"] = is_todo


def asset(path: str) -> str:
    """URL for a static asset. Engineer A swaps this for the hashed manifest."""
    return f"/static/{path}"


templates.env.globals["asset"] = asset


def render(request: Request, template: str, page: str, **ctx: Any) -> HTMLResponse:
    content: Content = get_content()
    return templates.TemplateResponse(
        request,
        template,
        {"site": content.site, "content": content, "page": page, **ctx},
    )


@app.get("/", response_class=HTMLResponse)
async def home(request: Request) -> HTMLResponse:
    return render(request, "pages/home.html", page="home")


@app.get("/work/{slug}", response_class=HTMLResponse)
async def work(request: Request, slug: str) -> HTMLResponse:
    project = get_content().project(slug)
    if project is None:
        raise HTTPException(status_code=404)
    template = "pages/replay.html" if project.case_study else "pages/work.html"
    return render(request, template, page="work", project=project)
