# Text-Based RPG Platform

Production-capable monorepo for persistent, AI-driven text RPG campaigns.

## Stack

- **Monorepo:** Turborepo (`apps/web`, `apps/worker`, `apps/realtime`, `packages/*`)
- **Frontend:** Next.js 16, React, Tailwind, shadcn-style UI, MapLibre GL
- **API:** Next.js route handlers → `@tbrpg/domain`
- **Database:** PostgreSQL + Prisma
- **Auth:** Better Auth (email/password, host/player/admin roles)
- **AI:** Provider-neutral layer with mock + OpenAI/Anthropic/Google adapters
- **Jobs:** BullMQ worker (`apps/worker`)
- **Realtime:** Socket.IO stub (`apps/realtime`)
- **Storage:** S3-compatible (MinIO in Docker) or local filesystem
- **Tests:** Vitest (unit + integration), Playwright (e2e)

## Realtime multiplayer architecture

The platform uses a **dedicated Socket.IO service** (`apps/realtime`) — not embedded in Next.js routes. Game state authority remains in **PostgreSQL** only.

### Action flow

1. Client sends typed `action:submit` via `RealtimeClient` (never raw Socket.IO in UI code)
2. Realtime service validates session → calls `submitActionIntent()` in `@tbrpg/domain`
3. Domain validates permissions, scene scope, reservations; writes `PendingAction`
4. Worker (or inline dev mode) calls `resolveActionIntent()` with distributed lock + DB transaction
5. Confirmed results broadcast via `RealtimeGateway` to permitted rooms only
6. Clients update UI from `action:resolved` / `campaign:event` — never from optimistic local state

### Key packages

| Package | Role |
|---------|------|
| `@tbrpg/shared` | Typed client/server event contracts + room names |
| `@tbrpg/realtime` | `RealtimeGateway` interface + Socket.IO adapter + browser `RealtimeClient` |
| `@tbrpg/domain` | Action resolver, broadcast planning, Redis locks/reservations |
| `apps/realtime` | Dedicated Socket.IO service (Redis Streams adapter, presence) |
| `apps/worker` | BullMQ `resolve-action` jobs + Redis fan-out |

### Room naming

`campaign:{id}` · `party:{id}` · `scene:{id}` · `private-scene:{id}` · `player:{id}` · `host:{id}`

### Dev commands

```bash
npm run docker:up
npm run dev   # web :3000, realtime :3001, worker
```

Set `REALTIME_INLINE_RESOLVE=true` in `.env` to resolve actions in the realtime service without the worker (dev only).

## Quick start

### Windows (PowerShell)

```powershell
cd D:\TextBasedRPG

# Copy env file (do not use `cp` on Windows CMD)
Copy-Item .env.example .env -Force
Copy-Item .env apps\web\.env -Force

npm install
npm run db:generate
```

You still need **PostgreSQL** and **Redis** running. Easiest option: [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/), then:

```powershell
npm run docker:up
npm run db:push
npm run dev
```

Without Docker, install [PostgreSQL](https://www.postgresql.org/download/windows/) and [Redis for Windows](https://github.com/redis-windows/redis-windows/releases) (or Memurai), create database `tbrpg`, and set `DATABASE_URL` / `REDIS_URL` in `.env`.

### macOS / Linux

```bash
cp .env.example .env
cp .env apps/web/.env
npm run docker:up
npm install
npm run db:generate
npm run db:push
npm run dev
```

Open http://localhost:3000 — register, create a campaign from a rough idea, play a freeform scene.

**Note:** Comments after commands break on Windows CMD (`#` is not a comment). Run commands without trailing `# ...` text.

## Phase 1 deliverables

| # | Deliverable | Status |
|---|-------------|--------|
| 1 | Monorepo + Docker Compose | Done |
| 2 | Auth + host/player permissions | Done |
| 3 | Prisma schema + migrations | Done |
| 4 | Campaign CRUD (isolated) | Done |
| 5 | Core domain models | Done |
| 6 | Event log + state-update service | Done |
| 7 | AI abstraction + mock + live adapters | Done |
| 8 | Campaign generator (rough idea) | Done |
| 9 | Playable freeform scene | Done |
| 10 | Automatic codex update | Done |
| 11 | Interactive map (MapLibre markers) | Done |
| 12 | Tests (isolation, persistence, events) | Done |

## Test commands

```bash
npm test                              # unit tests in packages
npm run test:integration              # requires Docker Postgres
npm run test:e2e                      # requires dev server
```

## Project layout

```
apps/web          Next.js UI + API routes
apps/worker       BullMQ background worker
apps/realtime     Socket.IO presence stub
packages/db       Prisma schema + client
packages/domain   Campaign/scene/event business logic
packages/ai       Provider-neutral AI routing
packages/shared   Zod schemas + shared types
packages/storage  S3/local object storage
```

## Environment

See `.env.example` for `DATABASE_URL`, `REDIS_URL`, `BETTER_AUTH_*`, `AI_PROVIDER=mock`, and MinIO settings.
