# JobAiro — Complete Setup & Deployment Guide

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Project Structure Overview](#2-project-structure-overview)
3. [Supabase Setup](#3-supabase-setup)
4. [Environment Variables](#4-environment-variables)
5. [Frontend — Next.js](#5-frontend--nextjs)
6. [Backend — FastAPI](#6-backend--fastapi)
7. [Scraper — Scrapy](#7-scraper--scrapy)
8. [Infrastructure — Docker Compose + Caddy](#8-infrastructure--docker-compose--caddy)
9. [Hetzner Server Provisioning](#9-hetzner-server-provisioning)
10. [GitHub Actions CI/CD](#10-github-actions-cicd)
11. [Go-Live Checklist](#11-go-live-checklist)
12. [Operations & Monitoring](#12-operations--monitoring)

---

## 1. Prerequisites

### Local machine

```bash
# Required tools
node >= 20          # frontend dev
python >= 3.11      # backend + scraper dev
docker >= 25        # all services
docker compose v2   # orchestration (comes with Docker Desktop)
git
```

### Accounts needed

| Service | Purpose | Free tier |
|---------|---------|-----------|
| [Supabase](https://supabase.com) | Database + Auth | Yes |
| [Hetzner](https://hetzner.com) | VPS hosting | ~€4/mo |
| GitHub | Code + CI/CD | Yes |
| Proxy provider (e.g. Oxylabs, BrightData) | Scraper rotation | Paid |
| SendGrid / Mailgun | SMTP alerts | Free tier |
| UptimeRobot | Monitoring | Free tier |

---

## 2. Project Structure Overview

```
JobAiro/
├── frontend/                   # Next.js 14 — user-facing app
│   ├── src/app/                # App router pages
│   ├── src/components/         # UI components
│   ├── src/lib/                # Supabase client, API wrapper, analytics
│   ├── src/hooks/              # useAuth, useJobs
│   ├── src/types/              # TypeScript types
│   └── src/middleware.ts       # Route protection
│
├── backend/                    # FastAPI — REST API
│   └── app/
│       ├── api/v1/             # Route handlers (jobs/users/recs/analytics/admin)
│       ├── core/               # Config, security, Supabase client
│       ├── schemas/            # Pydantic models
│       └── services/           # Business logic
│
├── scraper/                    # Scrapy — job data collection
│   └── jobairo_scraper/
│       ├── spiders/            # Greenhouse, Lever, Workday, ATS discovery
│       ├── middlewares/        # Proxy rotation, smart retry
│       ├── pipelines/          # Dedup, Supabase upsert
│       ├── settings.py         # Dev settings
│       └── settings_production.py  # CANONICAL production entrypoint
│
├── caddy/Caddyfile             # Reverse proxy + auto HTTPS
├── docker-compose.yml          # All services
├── .github/workflows/          # CI/CD pipelines
├── .env.example                # Environment variable template
└── Makefile                    # Developer shortcuts
```

---

## 3. Supabase Setup

### 3.1 Create projects

Create **two projects** in the Supabase dashboard:

- `jobairo-staging` — staging environment
- `jobairo-prod` — production environment

> Never mix staging and production data. Use completely separate projects.

### 3.2 Run database migrations

Open the **SQL Editor** in each project and run these migrations in order:

**Migration 001 — jobs table**

```sql
create table public.jobs (
  id           text primary key,
  title        text not null,
  company      text not null,
  location     text not null default '',
  type         text check (type in ('full-time','part-time','contract','remote')),
  salary_min   integer,
  salary_max   integer,
  description  text not null default '',
  apply_url    text not null,
  ats_source   text not null,
  board_url    text not null,
  posted_at    timestamptz,
  created_at   timestamptz not null default now()
);

create index idx_jobs_title     on public.jobs using gin(to_tsvector('english', title));
create index idx_jobs_company   on public.jobs (company);
create index idx_jobs_location  on public.jobs (location);
create index idx_jobs_posted_at on public.jobs (posted_at desc);
create index idx_jobs_ats_source on public.jobs (ats_source);
```

**Migration 002 — user job actions**

```sql
create table public.user_job_actions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  job_id     text not null references public.jobs(id) on delete cascade,
  action     text not null check (action in ('save','hide','apply','report')),
  created_at timestamptz not null default now(),
  unique(user_id, job_id, action)
);

create index idx_user_job_actions_user on public.user_job_actions (user_id);
create index idx_user_job_actions_job  on public.user_job_actions (job_id);
```

**Migration 003 — analytics events**

```sql
create table public.analytics_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in (
    'search_impression','job_click','apply_click',
    'view_duration','search_query','alert_creation'
  )),
  job_id     text references public.jobs(id) on delete set null,
  metadata   jsonb,
  created_at timestamptz not null default now()
);

create index idx_analytics_user    on public.analytics_events (user_id);
create index idx_analytics_type    on public.analytics_events (event_type);
create index idx_analytics_created on public.analytics_events (created_at desc);
```

**Migration 004 — ATS boards registry**

```sql
create table public.ats_boards (
  id         uuid primary key default gen_random_uuid(),
  company    text not null,
  board_url  text not null unique,
  ats_type   text not null,
  active     boolean not null default true,
  last_seen  timestamptz,
  created_at timestamptz not null default now()
);
```

**Migration 005 — job alerts**

```sql
create table public.job_alerts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  keyword    text,
  location   text,
  type       text,
  salary_min integer,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_job_alerts_user on public.job_alerts (user_id);
```

### 3.3 Row Level Security (RLS)

Run in SQL Editor:

```sql
-- Enable RLS on all user-specific tables
alter table public.user_job_actions  enable row level security;
alter table public.analytics_events  enable row level security;
alter table public.job_alerts        enable row level security;

-- jobs table: public read, service-key write only
alter table public.jobs enable row level security;
create policy "Public read jobs" on public.jobs for select using (true);

-- user_job_actions: users can only see/write their own
create policy "Own actions read" on public.user_job_actions
  for select using (auth.uid() = user_id);
create policy "Own actions insert" on public.user_job_actions
  for insert with check (auth.uid() = user_id);

-- analytics: users see their own; inserts from service key bypass RLS
create policy "Own analytics read" on public.analytics_events
  for select using (auth.uid() = user_id);

-- job_alerts: users manage their own
create policy "Own alerts all" on public.job_alerts
  for all using (auth.uid() = user_id);
```

### 3.4 Configure Auth

In **Supabase Dashboard → Authentication → Providers**:

**Email:**
- Enable email provider
- Enable "Confirm email"

**Google OAuth:**
1. Go to [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
2. Create OAuth 2.0 Client ID (Web application)
3. Add authorized redirect URIs:
   - Staging: `https://your-project-staging.supabase.co/auth/v1/callback`
   - Production: `https://your-project-prod.supabase.co/auth/v1/callback`
4. Copy Client ID and Secret into Supabase → Authentication → Providers → Google

**Redirect URLs** (Supabase → Authentication → URL Configuration):

```
# Staging
https://staging.jobairo.com/auth/callback

# Production
https://jobairo.com/auth/callback

# Local dev
http://localhost:3000/auth/callback
```

### 3.5 Set admin role

To grant admin access to a user:

```sql
-- Replace with the actual user's email
update auth.users
set raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'
where email = 'admin@jobairo.com';
```

---

## 4. Environment Variables

### 4.1 Get your keys from Supabase

Supabase Dashboard → Project Settings → API:

| Key | Where to use | Dashboard location |
|-----|-------------|-------------------|
| `Project URL` | Frontend + backend | API → Project URL |
| `anon public` key | Frontend only | API → Project API keys |
| `service_role` key | Backend + scraper only | API → Project API keys |
| JWT Secret | Backend (`JWT_SECRET`) | API → JWT Settings |

### 4.2 Create `.env` file

```bash
cp .env.example .env
```

Fill in every value. The backend will **fail at startup** if required vars are missing — this is intentional.

```bash
# .env  — NEVER commit this file

# ─── Caddy ────────────────────────────────────────────────────────────────────
CADDY_ACME_EMAIL=admin@jobairo.com

# ─── Frontend ─────────────────────────────────────────────────────────────────
NEXT_PUBLIC_SITE_URL=https://jobairo.com
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_BACKEND_URL=https://jobairo.com
# Server-side only (NOT exposed to browser)
BACKEND_URL=http://backend:8000

# ─── Backend ──────────────────────────────────────────────────────────────────
SUPABASE_URL=https://abcdefgh.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...   # service_role key
DATABASE_URL=postgresql://postgres:password@db.abcdefgh.supabase.co:5432/postgres
JWT_SECRET=your-jwt-secret-from-supabase-dashboard
CORS_ORIGINS=["https://jobairo.com","http://localhost:3000"]
ENVIRONMENT=production

# ─── Proxy ────────────────────────────────────────────────────────────────────
PROXY_URL=http://proxy.brightdata.com:22225
PROXY_USER=your-proxy-username
PROXY_PASS=your-proxy-password

# ─── SMTP ─────────────────────────────────────────────────────────────────────
SMTP_HOST=smtp.sendgrid.net
SMTP_USER=apikey
SMTP_PASS=SG.xxxxxx
ALERT_EMAIL=team@jobairo.com
```

> **Security rules:**
> - `NEXT_PUBLIC_*` vars are visible in the browser — only put the anon key there
> - `SUPABASE_SERVICE_KEY` and `JWT_SECRET` must never be in any `NEXT_PUBLIC_*` var
> - Staging and production must have **separate `.env` files** on separate servers

---

## 5. Frontend — Next.js

### 5.1 Local development

```bash
cd frontend

# Install dependencies
npm install

# Copy env for local dev
cp .env.example .env.local
# Edit .env.local:
#   NEXT_PUBLIC_SITE_URL=http://localhost:3000
#   NEXT_PUBLIC_BACKEND_URL=http://localhost:8000

# Start dev server
npm run dev
# → http://localhost:3000
```

### 5.2 Key pages and routes

| Route | Description | Auth required |
|-------|-------------|---------------|
| `/` | Homepage with search, filters, job list | No |
| `/login` | Google + email login | No |
| `/register` | Email registration | No |
| `/auth/callback` | OAuth redirect handler | No |
| `/jobs/[id]` | Full job detail | No |
| `/dashboard` | Saved / applied / hidden + recommendations | Yes |
| `/admin` | Admin panel (admin role required) | Yes + admin |
| `DELETE /api/user/delete` | Account deletion (server-side auth only) | Yes |

### 5.3 How auth works

```
User clicks "Sign in with Google"
  → supabase.auth.signInWithOAuth({ provider: 'google' })
  → Redirected to Google consent screen
  → Google redirects back to Supabase
  → Supabase redirects to /auth/callback?code=...
  → /auth/callback/route.ts exchanges code for session
  → Session stored in HTTP-only cookie
  → middleware.ts reads cookie on every protected route request
  → Redirects to /login if no valid session found
```

### 5.4 Analytics — all 6 events

All events fire via `src/lib/analytics.ts` → `POST /api/v1/analytics/events`:

```typescript
// 1. Job list rendered after search
analytics.searchImpression(jobIds, 'software engineer')

// 2. User opens a job card or modal
analytics.jobClick(job.id)

// 3. User clicks Apply button
analytics.applyClick(job.id)

// 4. User closes modal — records time spent
analytics.viewDuration(job.id, elapsedMs)

// 5. User submits a search
analytics.searchQuery('react developer', 45)

// 6. User creates a job alert
analytics.alertCreation({ keyword: 'react', location: 'London' })
```

> Analytics calls **never throw** — wrapped in try/catch so a network failure never breaks the UI.

### 5.5 Dark mode

Implemented via CSS class on `<html>`. `ThemeToggle` writes `dark` to `document.documentElement.classList` and persists to `localStorage`. An inline script in `layout.tsx` reads `localStorage` before React hydrates, preventing flash of wrong theme.

### 5.6 Security — api/user/delete

The delete route reads `userId` from the **server-side session only**, never from query params:

```typescript
// src/app/api/user/delete/route.ts
export async function DELETE() {
  const supabase = createClient()                      // server client
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // user.id comes from the verified JWT cookie — not from the request
  // ...
}
```

### 5.7 Production build

```bash
npm run build     # generates .next/standalone output
npm run start     # serves production build locally
```

### 5.8 Dockerfile stages

```
Stage 1 — deps     npm ci (cached layer)
Stage 2 — builder  npm run build
Stage 3 — runner   node:20-alpine, copies .next/standalone only
                   Non-root user, EXPOSE 3000, CMD node server.js
```

---

## 6. Backend — FastAPI

### 6.1 Local development

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy env
cp .env.example .env
# Edit .env with your Supabase keys

# Start with hot reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
# → http://localhost:8000
# → http://localhost:8000/docs  (Swagger UI)
```

### 6.2 API reference

Base URL: `https://jobairo.com/api/v1`

**Health check** — no auth required

```
GET /health
→ {"status": "ok", "timestamp": "2026-05-10T12:00:00"}
```

**Jobs** — search is public; actions require auth

```
GET /api/v1/jobs
    ?keyword=react
    &location=london
    &type=full-time          # full-time | part-time | contract | remote
    &salary_min=50000
    &posted_after=week       # 24h | week | month
    &sort_by=date            # date | salary | relevance
    &page=1
    &per_page=20
→ {"jobs": [...], "total": 142, "page": 1, "per_page": 20}

GET /api/v1/jobs/{id}
→ JobOut object

POST /api/v1/jobs/{id}/actions          ← Bearer token required
     {"action": "save"}                 # save | hide | apply | report
→ 204 No Content
```

**Users** — auth required

```
GET    /api/v1/users/me
→ {"id": "uuid", "email": "user@example.com", "role": null}

DELETE /api/v1/users/me
→ 204 No Content   (deletes Supabase auth user + cascades all related rows)
```

**Recommendations** — auth required

```
GET /api/v1/recommendations?limit=10
→ [JobOut, ...]    # scored by user's saves / applies / views
```

**Analytics** — auth optional (anonymous events accepted)

```
POST /api/v1/analytics/events
     {
       "event_type": "job_click",
       "job_id": "abc123",
       "metadata": {}
     }
→ 204 No Content
```

**Admin** — admin role required

```
GET /api/v1/admin/stats
→ {"total_jobs": 5420, "total_events": 12301}
```

### 6.3 Auth flow

Every protected endpoint uses the `get_current_user` dependency:

```
Request header: Authorization: Bearer <supabase_access_token>
  → HTTPBearer extracts token string
  → security.decode_token() verifies JWT signature using JWT_SECRET
  → Returns decoded payload (user UUID in "sub" field)
  → Raises HTTP 401 if token is invalid or expired
```

### 6.4 Config validation

`core/config.py` uses Pydantic `BaseSettings`. If any required var is missing or empty the **app refuses to start** with a clear error message:

```bash
# Test config validity before deploying
python -c "from app.core.config import settings; print('Config OK')"
```

### 6.5 Interactive docs

- `http://localhost:8000/docs` — Swagger UI (dev only)
- `http://localhost:8000/redoc` — ReDoc

> For production, disable by passing `docs_url=None, redoc_url=None` to `FastAPI()` if you do not want them public.

---

## 7. Scraper — Scrapy

### 7.1 Local development

```bash
cd scraper

python -m venv venv
source venv/bin/activate

pip install -r requirements.txt

cp .env.example .env
# Fill in SUPABASE_URL and SUPABASE_SERVICE_KEY
# PROXY_URL can be left empty in dev — proxy middleware disables itself automatically
```

### 7.2 Running spiders

**Development** (uses `settings.py`):

```bash
# Greenhouse boards
scrapy crawl greenhouse -a boards="shopify,stripe,airbnb"

# Lever boards
scrapy crawl lever -a boards="figma,netflix,notion"

# Workday boards — format: company:tenant
scrapy crawl workday -a boards="apple:apple"

# ATS discovery — reads seeds/ats_boards.csv
scrapy crawl ats_discovery
```

**Production** — always use `settings_production.py`:

```bash
scrapy crawl greenhouse \
  -a boards="shopify,stripe,airbnb,twilio,brex" \
  -s SCRAPY_SETTINGS_MODULE=jobairo_scraper.settings_production

scrapy crawl lever \
  -a boards="figma,netflix,notion,hashicorp,plaid,airtable,linear,vercel,rippling" \
  -s SCRAPY_SETTINGS_MODULE=jobairo_scraper.settings_production
```

> **Never use `run_production_scraper_10k.py`** — it is broken and not included in this scaffold.

### 7.3 Pipeline flow

```
Spider yields JobItem
  ↓
DedupPipeline (priority 100)
  checks in-memory set of known IDs loaded from Supabase on spider open
  if duplicate → DropItem (processing stops here)
  ↓
SupabasePipeline (priority 200)
  accumulates items in batches of 50
  upserts batch to Supabase jobs table (on_conflict = id)
  flushes remaining items on spider close
```

### 7.4 Proxy middleware

| Env | Behaviour |
|-----|-----------|
| `PROXY_URL` not set | Middleware raises `NotConfigured` → skipped automatically (safe for dev) |
| `PROXY_URL` set | All requests routed through proxy with `Proxy-Authorization` header |

Credentials always come from env vars — never hardcoded.

### 7.5 Retry middleware

Replaces Scrapy's default retry with exponential backoff + jitter:

```
Attempt 1 fails → wait ~1–2 s
Attempt 2 fails → wait ~2–3 s
Attempt 3 fails → wait ~4–5 s  (hard cap: 30 s)
3rd failure → item dropped, logged as WARNING
```

Retries on HTTP: `500, 502, 503, 504, 408, 429` and all network exceptions.

### 7.6 Failure recovery

`settings_production.py` sets `JOBDIR = "/tmp/scrapy_jobs"`. If the scraper process crashes mid-run, re-run the exact same command — Scrapy resumes from the checkpoint automatically.

### 7.7 Adding new ATS boards

Add rows to `seeds/ats_boards.csv`:

```csv
company,board_url,ats_type
mycompany,https://boards.greenhouse.io/mycompany,greenhouse
```

Then run `scrapy crawl ats_discovery` to register the new boards.

### 7.8 Schedule via cron (on the server)

```bash
crontab -e

# Greenhouse — daily at 02:00
0 2 * * * cd /opt/jobairo && \
  docker compose --profile scraper run --rm scraper \
  scrapy crawl greenhouse \
  -a boards="shopify,stripe,airbnb,twilio,brex" \
  -s SCRAPY_SETTINGS_MODULE=jobairo_scraper.settings_production \
  >> /var/log/jobairo/cron.log 2>&1

# Lever — daily at 03:00
0 3 * * * cd /opt/jobairo && \
  docker compose --profile scraper run --rm scraper \
  scrapy crawl lever \
  -a boards="figma,netflix,notion,hashicorp,plaid,airtable,linear,vercel,rippling" \
  -s SCRAPY_SETTINGS_MODULE=jobairo_scraper.settings_production \
  >> /var/log/jobairo/cron.log 2>&1
```

---

## 8. Infrastructure — Docker Compose + Caddy

### 8.1 Services overview

| Service | Image | Internal port | Exposed to internet |
|---------|-------|---------------|---------------------|
| `frontend` | Built from `./frontend` | 3000 | No |
| `backend` | Built from `./backend` | 8000 | No |
| `scraper` | Built from `./scraper` | — | No |
| `caddy` | `caddy:2-alpine` | 80, 443 | **Yes** |

Only Caddy faces the internet. Frontend and backend are reachable only through Caddy's internal Docker network.

### 8.2 Common Docker Compose commands

```bash
# Build all images
make build
# or: docker compose build

# Start all services in background
make up
# or: docker compose up -d

# View logs for all services
make logs
# or: docker compose logs -f

# View logs for one service
docker compose logs -f backend

# Stop all services
make down

# Rebuild and restart everything (after code changes)
make restart

# Run scraper as a one-shot job
make scrape
# or: docker compose --profile scraper run --rm scraper scrapy crawl greenhouse ...

# Open shell in a running container
make shell-backend
make shell-frontend
```

### 8.3 Caddy configuration explained

```caddy
{
    email {$CADDY_ACME_EMAIL}     # Let's Encrypt account email
}

jobairo.com, www.jobairo.com {

    # Redirect www → apex domain
    @www host www.jobairo.com
    redir @www https://jobairo.com{uri} permanent

    # All /api/* requests → FastAPI backend (inside Docker network)
    handle /api/* {
        reverse_proxy backend:8000 {
            header_up Host {host}
            header_up X-Real-IP {remote_host}
            header_up X-Forwarded-Proto {scheme}
        }
    }

    # Health check endpoint
    handle /health {
        reverse_proxy backend:8000
    }

    # Everything else → Next.js frontend
    handle {
        reverse_proxy frontend:3000 {
            header_up Host {host}
            header_up X-Real-IP {remote_host}
            header_up X-Forwarded-Proto {scheme}
        }
    }

    # Security headers
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Frame-Options "SAMEORIGIN"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"
        -Server
    }

    encode gzip
}
```

Caddy handles TLS automatically via Let's Encrypt — no certbot, no manual renewal.

### 8.4 Health checks

Both `frontend` and `backend` have Docker health checks defined in `docker-compose.yml`. Caddy will only receive traffic from healthy containers.

| Service | Health check URL |
|---------|-----------------|
| backend | `GET http://localhost:8000/health` |
| frontend | `GET http://localhost:3000/api/health` |

---

## 9. Hetzner Server Provisioning

### 9.1 Create server

1. Log in to [Hetzner Cloud Console](https://console.hetzner.cloud)
2. New Project → Create Server:
   - **Image:** Ubuntu 24.04
   - **Type:** CX22 (2 vCPU, 4 GB RAM) — minimum for staging
   - **Location:** Nuremberg or Helsinki
   - **SSH Key:** Add your public key
   - **Name:** `jobairo-staging` (or `jobairo-prod`)

### 9.2 Initial server setup

SSH in as root, then run:

```bash
ssh root@YOUR_SERVER_IP

# Create non-root deploy user
adduser deploy
usermod -aG sudo deploy
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy

# Harden SSH
nano /etc/ssh/sshd_config
# Set the following values:
#   PermitRootLogin no
#   PasswordAuthentication no
#   PubkeyAuthentication yes
systemctl restart ssh

# Firewall — allow only 80, 443, 22
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable

# Verify
ufw status
```

### 9.3 Install Docker

```bash
su - deploy

# Install Docker via official script
curl -fsSL https://get.docker.com | sudo sh

# Add deploy user to docker group (avoids needing sudo)
sudo usermod -aG docker deploy

# Log out and back in for group membership to apply
exit
su - deploy

# Verify
docker --version          # Docker version 25+
docker compose version    # Docker Compose version v2+
```

### 9.4 Deploy application

```bash
# Create app directory
sudo mkdir -p /opt/jobairo
sudo chown deploy:deploy /opt/jobairo
cd /opt/jobairo

# Clone repository
git clone https://github.com/your-org/jobairo.git .

# Create production environment file (never commit this)
nano .env
# Paste all production values and save

# Build and start
docker compose build
docker compose up -d

# Verify all services are running
docker compose ps
curl http://localhost:8000/health
```

### 9.5 Point your domain DNS

In your DNS provider's control panel:

```
A    jobairo.com      →  YOUR_HETZNER_IP
A    www.jobairo.com  →  YOUR_HETZNER_IP
```

DNS propagation takes 1–48 hours. Once DNS resolves, Caddy automatically obtains a TLS certificate from Let's Encrypt.

### 9.6 Verify HTTPS

```bash
# Watch Caddy logs for certificate issuance
docker compose logs caddy -f
# Look for: "certificate obtained successfully"

# Test from your local machine
curl -I https://jobairo.com/health
# HTTP/2 200
```

---

## 10. GitHub Actions CI/CD

### 10.1 Configure repository secrets

GitHub → Repository → Settings → Secrets and variables → Actions → New repository secret

**Staging secrets:**

| Secret name | Value |
|-------------|-------|
| `STAGING_SSH_KEY` | Private SSH key for staging server (contents of `~/.ssh/id_ed25519`) |
| `STAGING_HOST` | Hetzner staging server IP address |
| `STAGING_USER` | `deploy` |

**Production secrets:**

| Secret name | Value |
|-------------|-------|
| `PROD_SSH_KEY` | Private SSH key for production server |
| `PROD_HOST` | Hetzner production server IP address |
| `PROD_USER` | `deploy` |

### 10.2 Generate and register a deploy key

```bash
# Generate a dedicated deploy key pair on your local machine
ssh-keygen -t ed25519 -C "github-actions-jobairo" -f ~/.ssh/jobairo_deploy
# (press Enter for no passphrase)

# Copy PUBLIC key to the Hetzner server
ssh-copy-id -i ~/.ssh/jobairo_deploy.pub deploy@YOUR_SERVER_IP

# Add PRIVATE key content to GitHub Secrets
cat ~/.ssh/jobairo_deploy
# Copy the output → paste as STAGING_SSH_KEY in GitHub
```

### 10.3 Staging deployment flow

Triggers on every push to `main` or `develop`:

```
Push to main or develop
  → GitHub Actions runner starts (ubuntu-latest)
  → Loads STAGING_SSH_KEY into SSH agent
  → Adds server to known_hosts (ssh-keyscan)
  → SSH into Hetzner staging server
  → cd /opt/jobairo && git pull
  → docker compose build frontend backend
  → docker compose up -d --remove-orphans
  → curl http://localhost:8000/health  (verify)
  → Success or fail with notification
```

### 10.4 Production deployment flow

Triggers on tag push matching `v*`:

```bash
# Tag a release locally
git tag v1.0.0
git push origin v1.0.0

# GitHub Actions:
#   → SSH into production server
#   → git fetch --tags && git checkout v1.0.0
#   → docker compose build frontend backend
#   → docker compose up -d
#   → curl health check
#   → if FAIL: git checkout - && docker compose build && docker compose up -d  (ROLLBACK)
```

### 10.5 Manual rollback

If a deployment breaks production:

```bash
ssh deploy@YOUR_PROD_IP
cd /opt/jobairo

# List recent tags
git tag --sort=-version:refname | head -5

# Check out the previous working version
git checkout v0.9.0
docker compose build frontend backend
docker compose up -d

# Verify
curl http://localhost:8000/health
docker compose ps
```

---

## 11. Go-Live Checklist

Work through each phase in order. Do not advance until the current phase is fully complete.

### Phase 1 — Staging stable

```
[ ] Hetzner server provisioned, SSH hardened, firewall active (80/443/22 only)
[ ] Docker + Docker Compose v2 installed on server
[ ] Repo cloned to /opt/jobairo, .env filled with staging values
[ ] docker compose up -d — all services running (caddy, frontend, backend)
[ ] https://staging.jobairo.com loads with valid TLS certificate
[ ] https://staging.jobairo.com/health returns {"status": "ok"}
[ ] GitHub Actions deploy-staging.yml triggers on push and completes successfully
[ ] Rollback procedure tested (check out previous commit + rebuild + verify)
[ ] Staging uses staging Supabase project — no production data involved
```

### Phase 2 — Core features verified

```
[ ] Homepage loads, search returns real jobs from Supabase jobs table
[ ] Filters (type, location, salary, date range) correctly narrow results
[ ] Sorting by date and salary changes result order correctly
[ ] Job card displays title, company, location, type, salary, posted date
[ ] Job modal opens on card click, closes on ESC key and backdrop click
[ ] Save / Hide / Apply / Share / Report buttons work and persist across page reload
[ ] Dashboard shows Saved / Applied / Hidden tabs with correct jobs for current user
[ ] Recommendations load on dashboard (personalised from user interaction history)
[ ] Dark mode toggle works and persists across page refresh
[ ] Google OAuth login works end-to-end (login → Google → callback → dashboard)
[ ] Email/password login and registration work correctly
[ ] Admin page shows 403/redirect for non-admin users
[ ] Mobile layout: no horizontal overflow, readable at 375px viewport width
[ ] No React hydration errors in browser console
```

### Phase 3 — Security verified

```
[ ] DELETE /api/user/delete reads userId from server session only (not query param)
[ ] No /debug or /debug/auth-status route is accessible
[ ] NEXT_PUBLIC_* variables contain no service key or JWT secret
[ ] RLS policies verified: users can only read/write their own actions and alerts
[ ] CORS_ORIGINS in backend .env does not contain a wildcard *
[ ] All 6 analytics events appear in analytics_events table after triggering each action
```

### Phase 4 — Scraper and infrastructure

```
[ ] make scrape runs without errors and inserts rows into Supabase jobs table
[ ] jobs table has 100+ rows after first scrape run
[ ] GET /api/v1/jobs returns the scraped jobs through the API
[ ] DedupPipeline: running the same scrape twice creates no duplicate rows
[ ] Proxy credentials work (no proxy auth errors in scraper logs)
[ ] JOBDIR recovery: kill scraper mid-run, re-run, confirm it resumes correctly
[ ] Cron jobs scheduled on server for daily greenhouse and lever scrapes
[ ] SMTP alert email received when scraper fails (test with invalid Supabase URL)
[ ] UptimeRobot monitor set up for https://jobairo.com/health (5-min interval)
```

### Phase 5 — Production launch

```
[ ] Production Supabase project created, all 5 migrations run
[ ] Production .env created on production server with production keys
[ ] DNS A records pointed to production Hetzner server
[ ] https://jobairo.com loads with valid TLS certificate
[ ] Full smoke test on production: search → click job → apply → check dashboard
[ ] All 6 analytics events logging to production Supabase analytics_events table
[ ] Delete-account flow tested end-to-end (account fully removed)
[ ] Production GitHub Actions secrets configured (PROD_SSH_KEY, PROD_HOST, PROD_USER)
[ ] Tag v1.0.0 pushed, deploy-production.yml runs and succeeds
[ ] Go-live approved by Alishia's Founding Engineer
```

---

## 12. Operations & Monitoring

### 12.1 UptimeRobot setup

1. Sign in at [uptimerobot.com](https://uptimerobot.com)
2. Add Monitor → HTTP(s):
   - URL: `https://jobairo.com/health`
   - Check interval: 5 minutes
   - Alert contacts: team email
3. Add a second monitor for `https://jobairo.com` (frontend availability)

### 12.2 Daily operations reference

```bash
# Check all service status
docker compose ps

# Tail all service logs
make logs

# Tail a specific service
docker compose logs -f backend
docker compose logs -f caddy

# Check last scraper run
tail -50 /var/log/jobairo/cron.log

# Check total job count in Supabase
docker compose exec backend python -c "
from app.core.supabase import get_supabase
sb = get_supabase()
r = sb.table('jobs').select('id', count='exact').execute()
print(f'Total jobs: {r.count}')
"

# Restart a single service without affecting others
docker compose restart backend
docker compose restart frontend

# Rebuild and restart a single service after a code change
docker compose build backend && docker compose up -d backend
```

### 12.3 Log locations

| Log source | How to access |
|------------|---------------|
| Backend app logs | `docker compose logs backend` |
| Frontend app logs | `docker compose logs frontend` |
| Caddy access + TLS logs | `docker compose logs caddy` |
| Cron job output | `/var/log/jobairo/cron.log` |
| Scraped items (JSONL) | `/var/log/jobairo/scraped_*.jsonl` |

### 12.4 Scaling backend

When traffic increases, scale the backend horizontally. Caddy load-balances automatically:

```bash
# Scale to 3 backend instances
docker compose up -d --scale backend=3
```

Update `caddy/Caddyfile` if you need explicit load balancing policy:

```caddy
handle /api/* {
    reverse_proxy backend:8000 {
        lb_policy round_robin
    }
}
```

### 12.5 Testing SMTP alerts

Verify scraper failure notifications work before going live:

```bash
# Force a failure by using an invalid Supabase URL
docker compose --profile scraper run --rm \
  -e SUPABASE_URL=https://invalid.supabase.co \
  scraper scrapy crawl greenhouse -a boards="shopify"

# Check ALERT_EMAIL inbox for the failure notification
```

### 12.6 Standard release workflow

```bash
# 1. Develop on a feature branch
git checkout -b feature/my-feature

# 2. Open a pull request → review → merge to main
#    → GitHub Actions auto-deploys to staging

# 3. Verify on staging.jobairo.com

# 4. Tag for production release
git tag v1.2.0
git push origin v1.2.0
#    → GitHub Actions deploys to production with health-check + auto-rollback
```

---

## Quick Reference Card

```bash
# ── Local Development ──────────────────────────────────────────────────────────
cd frontend  && npm run dev                           # Next.js  → :3000
cd backend   && uvicorn app.main:app --reload         # FastAPI  → :8000
cd scraper   && scrapy crawl greenhouse -a boards="shopify"

# ── Docker ─────────────────────────────────────────────────────────────────────
make build                  # build all Docker images
make up                     # start all services (detached)
make down                   # stop all services
make logs                   # tail logs for all services
make restart                # rebuild + restart everything
make scrape                 # run greenhouse scraper (production settings)
make scrape-lever           # run lever scraper
make scrape-workday         # run workday scraper
make shell-backend          # open shell inside backend container
make shell-frontend         # open shell inside frontend container

# ── Deploy ─────────────────────────────────────────────────────────────────────
git push origin main                         # auto-deploy to staging
git tag v1.0.0 && git push origin v1.0.0    # auto-deploy to production

# ── Verify ─────────────────────────────────────────────────────────────────────
curl https://jobairo.com/health              # → {"status":"ok","timestamp":"..."}
docker compose ps                            # → all services Up (healthy)
docker compose logs -f backend              # → watch backend logs live
```
