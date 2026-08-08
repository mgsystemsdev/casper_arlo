# Casper & Arlo Care App

Personal care dashboard for Casper (ball python) and Arlo (crested gecko) — FastAPI + Postgres + React/Tailwind.

Scaffolded from the Allie Care stack. Multi-pet switching, species packs, household digests, and legacy import are live.

## Stack

- `apps/api` — FastAPI, SQLAlchemy, Alembic
- `apps/web` — React, Vite, Tailwind (the live UI)
- Postgres on Railway (or Docker Compose locally)
- `archive/legacy-dashboard.html` — **retired** static prototype (import / history only)
- Root `index.html` — pointer to the Care app + archive (not a care UI)

## Local development

### 1. Database

```bash
docker compose up -d db
```

### 2. API

```bash
cd apps/api
python3.13 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL=postgresql+psycopg2://casper:casper@localhost:5432/casper_arlo
export APP_PASSWORD=casper
export APP_SECRET=dev-secret
export WEB_ORIGIN=http://localhost:5173
export RESEND_API_KEY=           # from Resend dashboard (never commit)
export RESEND_FROM="Casper & Arlo Care <onboarding@resend.dev>"
export CRON_SECRET=dev-cron-secret
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### Email digests + in-process scheduler

Settings control destination email, timezone, digest times, **digest mode**, care intervals, and which event emails fire.

| Digest mode | Behavior |
|-------------|----------|
| **Household** (default) | One email covering Casper & Arlo |
| **Per pet** | Separate email per animal at the same schedule |

Event alerts (feed overdue, clear-to-handle, maintenance, etc.) are always **per animal**, with animal-scoped dedupe keys.

Secrets stay in env: `RESEND_API_KEY`, `RESEND_FROM`.

The API starts an **in-process scheduler** on boot (no Railway cron required).

Use **Settings → Send today’s digest** after setting `RESEND_API_KEY` and destination email.

### 3. Web

```bash
cd apps/web
npm install
npm run dev
```

Open http://localhost:5173 — password defaults to `casper`.

### Mobile (PWA)

The web app is installable as a home-screen app (same React build):

1. Deploy or open over **HTTPS** (or `localhost` for testing).
2. **iPhone:** Safari → Share → **Add to Home Screen**.
3. **Android:** Chrome → menu → **Install app** / **Add to Home screen**.

### Full stack via Docker

```bash
docker compose up --build
```

- Web: http://localhost:8080  
- API: http://localhost:8000  

## Railway deploy

1. Create a Railway project and add a **Postgres** plugin.
2. Create service **api** from this repo:
   - Root / Dockerfile: `apps/api/Dockerfile`
   - Variables:
     - `DATABASE_URL` (from Postgres reference)
     - `APP_PASSWORD` — shared login password
     - `APP_SECRET` — random secret for tokens
     - `WEB_ORIGIN` — public web URL
     - `UPLOAD_DIR=/data/uploads`
     - `RESEND_API_KEY`
     - `RESEND_FROM`
     - `CRON_SECRET` (optional — only if you still use `/api/internal/tick`)
   - Attach a **volume** at `/data`
3. Create service **web** from `apps/web/Dockerfile`:
   - Build arg / env `VITE_API_URL` = public API URL (no trailing slash)

## Tests

```bash
cd apps/api && PYTHONPATH=. .venv/bin/pytest tests/ -q
```

## Seeded animals

| Name   | Species              | Morph        | DOB        | Owner         |
|--------|----------------------|--------------|------------|---------------|
| Casper | *Python regius*      | BEL          | 2025-07-31 | Erica Motilla |
| Arlo   | *Correlophus ciliatus*| Lily White  | 2025-09-10 | Erica Motilla |

Pet switcher + dual themes (Casper light / Arlo amber) are live. Species packs drive feeding intervals, habitat bands, diet vs prey guides, and Arlo’s tail tracker.

## Retired static dashboard

The original single-file UI is archived at [`archive/legacy-dashboard.html`](archive/legacy-dashboard.html). It is **not** the product — import source / history only.

### Migrate old localStorage

localStorage is origin-scoped, so the static page cannot write into the app automatically.

1. Open `archive/legacy-dashboard.html` → **Export for app** (downloads `casper-arlo-legacy-export.json`).
2. In the Care app → **Settings → Migrate from static page** → upload that file → **Import both pets**.
3. Duplicates are skipped by default (`c_*` → Casper, `a_*` / `a_tail` → Arlo).

See [`archive/README.md`](archive/README.md).

## Optional later

- Per-animal email interval overrides
