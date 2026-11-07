"""Application entry point.

``create_app()`` builds the FastAPI app; ``app`` is the instance uvicorn serves.
Routes and the template context follow CONTRACTS.md.
"""

from __future__ import annotations

import logging
import platform
import secrets
import time
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Literal

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from jinja2 import TemplateNotFound, pass_context
from jinja2.runtime import Context
from markupsafe import Markup
from pydantic import BaseModel, ValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.gzip import GZipMiddleware

from app.ask import (
    Asker,
    AskRequest,
    ClientFactory,
    SlidingWindowLimiter,
    client_ip,
    default_client_factory,
    error_body,
    error_event,
    invalid_message,
)
from app.assets import DIST_DIR, MANIFEST_NAME, AssetResolver, Manifest, is_hashed_url
from app.content import Content, get_content, is_todo
from app.importmap import ImportMap
from app.settings import Settings, get_settings

ROOT = Path(__file__).resolve().parent.parent
STATIC_DIR = ROOT / "static"
TEMPLATES_DIR = ROOT / "templates"
STARTED = time.monotonic()
MAX_ASK_BODY = 16_384

log = logging.getLogger("vd")


class StatusSnapshot(BaseModel):
    status: Literal["nominal", "degraded"]
    uptime_s: int
    build: str
    region: str
    python: str
    server_time: str
    ask: Literal["online", "offline"]


# Content-Security-Policy. The inline import map carries a per-request nonce;
# every other script is a file from this origin or jsDelivr. style-src allows
# inline styles because templates set custom properties in style attributes.
CSP = (
    "default-src 'self'; "
    "script-src 'self' 'nonce-{nonce}' https://cdn.jsdelivr.net; "
    "style-src 'self' 'unsafe-inline'; "
    "img-src 'self' data: blob:; "
    "font-src 'self'; "
    "connect-src 'self' https://cdn.jsdelivr.net; "
    "worker-src 'self' blob:; "
    "media-src 'self'; "
    "object-src 'none'; "
    "base-uri 'self'; "
    "form-action 'self'; "
    "frame-ancestors 'none'"
)
PERMISSIONS_POLICY = (
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()"
)

NOT_FOUND_FALLBACK = """<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Page not found · vd</title></head>
<body><main id="main" data-page="404"><h1>Page not found</h1>
<p>This page doesn't exist. <a href="/">Go to the home page</a>.</p></main></body></html>
"""


def create_app(
    settings: Settings | None = None,
    *,
    content: Content | None = None,
    templates_dir: Path = TEMPLATES_DIR,
    static_dir: Path = STATIC_DIR,
    manifest_path: Path | None = None,
    client_factory: ClientFactory = default_client_factory,
) -> FastAPI:
    settings = settings or get_settings()
    content = content or get_content()  # validates /content; a bad file stops startup
    manifest = Manifest.load(manifest_path or (static_dir / "dist" / MANIFEST_NAME))
    if settings.is_prod and manifest is None:
        log.warning("no asset manifest at %s; serving unhashed assets", DIST_DIR)
    asset = AssetResolver(manifest, hashed=settings.is_prod)
    importmap = ImportMap.load()
    asker = Asker(settings, content, client_factory)
    limiter = SlidingWindowLimiter(settings.ask_rate)
    global_limiter = SlidingWindowLimiter(settings.ask_global_rate)

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        log.info(
            "vd starting: env=%s build=%s ask=%s",
            settings.env,
            settings.build,
            "online" if settings.ask_enabled else "offline",
        )
        yield

    app = FastAPI(title="vd", docs_url=None, redoc_url=None, openapi_url=None, lifespan=lifespan)
    app.state.settings = settings
    app.state.asker = asker
    app.state.limiter = limiter
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

    templates = Jinja2Templates(directory=templates_dir)
    templates.env.tests["todo"] = is_todo
    templates.env.globals["asset"] = asset

    @pass_context
    def import_map(ctx: Context) -> Markup:
        request = ctx.get("request")
        nonce = getattr(request.state, "csp_nonce", None) if request is not None else None
        return importmap.script_tag(nonce)

    templates.env.globals["import_map"] = import_map
    templates.env.globals["cdn_script"] = importmap.cdn_script

    def snapshot() -> StatusSnapshot:
        return StatusSnapshot(
            status="degraded" if asker.health.degraded else "nominal",
            uptime_s=int(time.monotonic() - STARTED),
            build=settings.build,
            region=settings.region,
            python=platform.python_version(),
            server_time=datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
            ask="online" if settings.ask_enabled else "offline",
        )

    def render(
        request: Request, template: str, page: str, status_code: int = 200, **ctx: Any
    ) -> HTMLResponse:
        return templates.TemplateResponse(
            request,
            template,
            {
                "site": content.site,
                "content": content,
                "page": page,
                "status": snapshot(),
                "ask_enabled": settings.ask_enabled,
                "csp_nonce": getattr(request.state, "csp_nonce", ""),
                "site_url": settings.site_url or str(request.base_url).rstrip("/"),
                **ctx,
            },
            status_code=status_code,
        )

    # -- middleware ---------------------------------------------------------

    @app.middleware("http")
    async def headers(
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        nonce = secrets.token_urlsafe(16)
        request.state.csp_nonce = nonce
        response = await call_next(request)
        h = response.headers
        h.setdefault("Content-Security-Policy", CSP.format(nonce=nonce))
        h.setdefault("X-Content-Type-Options", "nosniff")
        h.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        h.setdefault("Permissions-Policy", PERMISSIONS_POLICY)
        h.setdefault("X-Frame-Options", "DENY")
        h.setdefault("Cross-Origin-Opener-Policy", "same-origin")
        if settings.is_prod:
            h.setdefault("Strict-Transport-Security", "max-age=63072000; includeSubDomains")
        if is_hashed_url(request.url.path) and response.status_code == 200:
            h["Cache-Control"] = "public, max-age=31536000, immutable"
        else:
            # HTML, API responses and unhashed static files always revalidate.
            h.setdefault("Cache-Control", "no-cache")
        return response

    # Added last so it runs outermost; Starlette skips text/event-stream.
    app.add_middleware(GZipMiddleware, minimum_size=500)

    # -- errors -------------------------------------------------------------

    @app.exception_handler(StarletteHTTPException)
    async def http_error(request: Request, exc: StarletteHTTPException) -> Response:
        if exc.status_code == 404:
            try:
                return render(request, "pages/404.html", page="404", status_code=404)
            except TemplateNotFound:
                return HTMLResponse(NOT_FOUND_FALLBACK, status_code=404)
        return JSONResponse(
            {"detail": exc.detail}, status_code=exc.status_code, headers=exc.headers
        )

    # -- pages --------------------------------------------------------------

    @app.get("/", response_class=HTMLResponse)
    async def home(request: Request) -> HTMLResponse:
        return render(request, "pages/home.html", page="home")

    @app.get("/work/{slug}", response_class=HTMLResponse)
    async def work(request: Request, slug: str) -> HTMLResponse:
        project = content.project(slug)
        if project is None:
            raise StarletteHTTPException(status_code=404)
        template = "pages/replay.html" if project.case_study else "pages/work.html"
        return render(request, template, page="work", project=project)

    # -- API ----------------------------------------------------------------

    @app.get("/healthz")
    async def healthz() -> dict[str, bool]:
        return {"ok": True}

    @app.get("/api/status")
    async def status() -> StatusSnapshot:
        return snapshot()

    @app.post("/api/ask")
    async def ask(request: Request) -> Response:
        sse_headers = {"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}

        def one_event(event: str, status_code: int) -> Response:
            return Response(
                event, status_code=status_code, media_type="text/event-stream", headers=sse_headers
            )

        raw = await request.body()
        try:
            if len(raw) > MAX_ASK_BODY:
                raise ValueError("body too large")
            req = AskRequest.model_validate_json(raw)
        except ValidationError as exc:
            return one_event(error_event("invalid", invalid_message(exc)), 422)
        except ValueError:
            return one_event(error_event("invalid", "Ask a shorter question."), 413)

        if settings.ask_enabled:
            ip = client_ip(request.headers, request.client.host if request.client else None)
            wait = limiter.hit(ip) or global_limiter.hit("*")
            if wait is not None:
                return JSONResponse(
                    error_body("rate_limited", asker.messages.rate_limited),
                    status_code=429,
                    headers={"Retry-After": str(int(wait) + 1)},
                )

        return StreamingResponse(
            asker.stream(req), media_type="text/event-stream", headers=sse_headers
        )

    return app


app = create_app()
