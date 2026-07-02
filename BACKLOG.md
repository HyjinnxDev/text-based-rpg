# Project Backlog — Loop Working File

The autonomous loop works through this file top-to-bottom. Each iteration: pick the
highest unblocked item, complete it (code + tests + verify build), mark it done with
a date, commit, then re-arm the loop. Update this file as the single source of truth.

Rules for each iteration:
- Run `npm test` and `npm run build --workspace=@tbrpg/web` before marking an item done.
- Commit completed work to master (or a branch + PR for large/risky items).
- If an item is blocked (needs user secrets, external account, etc.), mark it BLOCKED with a note and move on.
- Add newly discovered work to the appropriate phase rather than doing it ad hoc.

## Phase A — Unblock what's in flight


## Phase B — Expose built backends in the UI (quick wins)

- [ ] B4. Character naming at campaign creation (currently auto-named "Adventurer").
- [ ] B5. Inventory/items panel in play view (state engine already updates items).
- [ ] B6. Quests panel in play view (state engine already updates quests).
- [ ] B7. NPC panel with memory/mood display (data already stored).
- [ ] B8. Show character/NPC portraits in UI where generated (Gemini art now stores `portraitUrl`).

## Phase C — Multiplayer core

- [ ] C1. Party campaign creation in UI (schema + PARTY mode exist).
- [ ] C2. Invite flow: generate join link, join-by-link page, membership creation with player role.
- [ ] C3. Member list UI with roles; host can remove players.
- [ ] C4. Scene scoping for parties: who sees which scene, private scenes.
- [ ] C5. Turn handling for parties (simultaneous or ordered action resolution) — design then implement.

## Phase D — Host & account tools

- [ ] D1. Host controls: pause campaign, override/retcon last event.
- [ ] D2. Player knowledge panel (per-player secrets already in DB).
- [ ] D3. Multiple scenes: scene list, create/switch scenes in UI.
- [ ] D4. Email verification + password reset flows (Better Auth).
- [ ] D5. AI provider settings UI (per-campaign or account level; adapters exist).

## Phase E — Infrastructure & quality

- [ ] E1. GitHub Actions CI: lint + unit tests on PR; integration tests with Postgres service container.
- [ ] E2. Verify Gemini art pipeline works on Vercel (GEMINI_KEY + Blob storage) — BLOCKED if no key access; document verification steps instead.
- [ ] E3. Realtime deploy readiness: document/script Railway deploy for `apps/realtime` + `apps/worker` (actual deploy needs user account — mark BLOCKED at that point).
- [ ] E4. E2E test coverage for core flows: register → create campaign → act → codex/map update.
- [ ] E5. Error handling pass: API error states surfaced in UI (toasts), AI failure retries.

## Phase F — Stretch (original vision)

- [ ] F1. Semantic codex search (vectors).
- [ ] F2. Fog of war / map layers UI.
- [ ] F3. Campaign snapshots / time-travel UI.
- [ ] F4. Admin dashboard.

## Done

- [x] B3. (2026-07-02) New-campaign page now has Rough idea / Random / Custom mode tabs matching `createCampaignSchema`; random takes optional tone/genre, custom takes title/premise/setting/tone/genre with client-side validation mirroring the schema minimums. Build + lints clean.

- [x] B1+B2. (2026-07-02) Delete + export buttons on campaign cards (`campaign-card-actions.tsx`): two-step delete confirm calling `DELETE /api/campaigns/:id`, export via `GET /api/campaigns/:id/export` download link. Build + lints clean.
- [x] A2. (2026-07-02) Merged PR #3 to master (Vercel check green, merge state CLEAN). Visual test-plan items best verified on the live deploy.
- [x] A1. (2026-07-02) Resolved PR #3 merge conflicts against master. Kept mobile-first layouts, integrated Gemini `mapConfig` tiles, portrait markers, and landscape image into both mobile and desktop views. Build + all unit tests pass. Pushed `6ec0a30`, PR marked ready for review.
