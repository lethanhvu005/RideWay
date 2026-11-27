FROM node:24-bookworm-slim AS frontend
WORKDIR /build
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.14-slim-bookworm
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./backend/
COPY --from=frontend /build/dist ./frontend/dist/
COPY scripts/render-start.sh ./scripts/render-start.sh
RUN DJANGO_SECRET_KEY=build-only-collectstatic DJANGO_DEBUG=True python backend/manage.py collectstatic --noinput && useradd --create-home app && chown -R app:app /app
USER app
EXPOSE 10000
CMD ["sh", "scripts/render-start.sh"]
