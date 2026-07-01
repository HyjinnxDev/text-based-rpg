# Deploy: GitHub + Vercel (+ optional Railway for realtime)

Use this guide to test on your **iPhone** (Safari) and edit in **Cursor iOS** via GitHub sync.

## Architecture on cloud

| Service | Host | Purpose |
|---------|------|---------|
| `apps/web` | **Vercel** | Next.js UI + API |
| PostgreSQL | **Neon** (Vercel integration) | Database |
| Redis | **Upstash** (Vercel integration) | Locks, presence, queues |
| `apps/realtime` | **Railway** (optional) | Socket.IO |
| `apps/worker` | **Railway** (optional) | BullMQ jobs |

**Vercel-only mode:** Leave `NEXT_PUBLIC_REALTIME_URL` unset. Gameplay uses REST actions (works on iPhone without Railway).

**Full multiplayer mode:** Deploy realtime + worker to Railway, set `NEXT_PUBLIC_REALTIME_URL`.

---

## Step 1 — GitHub repo

In **PowerShell** from `D:\TextBasedRPG`:

```powershell
git init
git add .
git commit -m "Initial commit: text-based RPG platform"

# Log in to GitHub (browser opens)
gh auth login

# Create repo under your account (change name if taken)
gh repo create text-based-rpg --public --source=. --remote=origin --push
```

**Cursor iOS:** Open the same GitHub repo in Cursor mobile — edits push/pull like a normal git repo.

---

## Step 2 — Vercel project

### Option A — Vercel website (easiest)

1. Go to [vercel.com/new](https://vercel.com/new)
2. **Import** your `text-based-rpg` GitHub repo
3. Configure:
   - **Root Directory:** `apps/web`
   - **Framework:** Next.js (auto)
   - **Install Command:** `cd ../.. && npm install`
   - **Build Command:** `cd ../.. && npm run db:generate && npm run build --workspace=@tbrpg/web`
4. Add integrations:
   - **Neon** → creates `DATABASE_URL`
   - **Upstash Redis** → creates `REDIS_URL`
5. Add environment variables:

| Variable | Value |
|----------|--------|
| `BETTER_AUTH_SECRET` | Random 32+ char string |
| `BETTER_AUTH_URL` | `https://YOUR-APP.vercel.app` |
| `NEXT_PUBLIC_APP_URL` | `https://YOUR-APP.vercel.app` |
| `AI_PROVIDER` | `mock` |
| `STORAGE_DRIVER` | `local` |
| `REALTIME_INLINE_RESOLVE` | `true` (only if using Railway realtime) |

6. **Do not set** `NEXT_PUBLIC_REALTIME_URL` until Railway realtime is deployed (REST mode works without it).

7. Deploy → run DB push once from your PC:

```powershell
# Pull production DATABASE_URL from Vercel, or copy Neon connection string into .env
$env:DATABASE_URL = "postgresql://..."
npm run db:push
```

### Option B — Vercel CLI

```powershell
npm i -g vercel
vercel login
cd D:\TextBasedRPG\apps\web
vercel link
vercel env pull
vercel --prod
```

---

## Step 3 — Test on iPhone

1. Open `https://YOUR-APP.vercel.app` in Safari
2. Register → New campaign → Play
3. Take a freeform action (REST mode works without realtime)

---

## Step 4 — Optional Railway (realtime multiplayer)

1. [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
2. Add service: **Root** `apps/realtime`, start: `npm run start --workspace=@tbrpg/realtime-service`
3. Add service: **Root** `apps/worker`, start: `npm run start --workspace=@tbrpg/worker`
4. Share env vars: `DATABASE_URL`, `REDIS_URL`, `AI_PROVIDER=mock`, `REALTIME_INLINE_RESOLVE=false`
5. Copy realtime public URL → Vercel env: `NEXT_PUBLIC_REALTIME_URL=https://....railway.app`
6. Redeploy Vercel

---

## Cursor iOS workflow

1. Clone/open `github.com/YOUR_USER/text-based-rpg` in Cursor iOS
2. Edit on phone → commit → push
3. Vercel auto-deploys on push to `main`
4. Refresh Safari on iPhone to test changes

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Build fails on Prisma | Ensure `postinstall` runs `db:generate`; Neon `DATABASE_URL` set |
| Auth redirect loops | `BETTER_AUTH_URL` must exactly match Vercel URL (https, no trailing slash) |
| "Realtime Offline" on Vercel | Expected without Railway — use REST (leave `NEXT_PUBLIC_REALTIME_URL` unset) |
| `docker` not found locally | Use Neon + Upstash cloud; Docker only needed for local dev |
