# syntax=docker/dockerfile:1
# Two stages: build the venv, Tailwind CSS and hashed assets, then copy only
# what runs into a slim, non-root runtime image.

FROM ghcr.io/astral-sh/uv:0.11.32 AS uv

FROM python:3.12-slim AS build
COPY --from=uv /uv /uvx /bin/
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never \
    UV_PROJECT_ENVIRONMENT=/app/.venv
WORKDIR /app

# Dependencies first, so code changes don't reinstall them.
COPY pyproject.toml uv.lock .python-version ./
RUN uv sync --frozen --no-dev --no-install-project

COPY app ./app
COPY content ./content
COPY templates ./templates
COPY static ./static
COPY scripts ./scripts
# Tailwind's standalone CLI (downloaded by the script), then content-hashed assets.
RUN scripts/tailwind.sh build \
 && /app/.venv/bin/python scripts/build_assets.py

FROM python:3.12-slim AS runtime
RUN useradd --system --uid 10001 --user-group --no-create-home vd
WORKDIR /app
COPY --from=build /app/.venv /app/.venv
COPY --from=build /app/app ./app
COPY --from=build /app/content ./content
COPY --from=build /app/templates ./templates
COPY --from=build /app/static ./static
ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    ENV=prod \
    PORT=10000
USER vd
EXPOSE 10000
# Render terminates TLS and forwards to $PORT; trust its X-Forwarded-* headers.
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port \"$PORT\" --proxy-headers --forwarded-allow-ips='*' --no-server-header"]
