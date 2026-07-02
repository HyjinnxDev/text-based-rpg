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


## Phase P — Performance (current priority)

- [ ] P4. Trim `getCampaign` payload: select only fields the play page uses (characters/npcs currently return full rows including profiles).
- [ ] P5. Review Prisma indexes for hot queries (events by campaign+sequence, actions by campaign+user).

## Phase B — Expose built backends in the UI (quick wins)

- [ ] B7. NPC panel with memory/mood display (data already stored).
- [ ] B8. Show character/NPC portraits in UI where generated (Gemini art now stores `portraitUrl`).

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

- [x] P2+P3. (2026-07-02) One `GET /api/campaigns/:id/state` endpoint (`getCampaignPanelState`: single access check + parallel queries for codex/items/quests/members/turns) replaces 4 separate panel fetches per update; `useCampaignPanels` hook distributes data to now-presentational Codex/Journal/Members/Turn components. `maplibre-gl` dynamically imported (`ssr: false`) so the play page shell renders before the ~250KB map bundle. Tests + build clean.

- [x] P1. (2026-07-02) Fast campaign creation + parallel pipelines: art generation (map/tiles/landscape/portraits) moved out of the request path into Next.js `after()` — response returns as soon as the world is seeded; play page polls briefly until the map appears. `seedGeneratedWorld` batched with `createMany`/`Promise.all`; map/landscape/portrait jobs and tile uploads now run concurrently (`Promise.allSettled` so one failure doesn't sink the rest); action resolver parallelizes pre-AI reads and post-transaction fetches; `maxDuration=300` on the campaigns route. Tests + build clean.

- [x] C5. (2026-07-02) Turn handling: opt-in per-scene rounds mode (design: free-form default preserved; rounds = one action per player per round, auto-advance when all HOST/PLAYER members have acted). `turns.ts` domain module (turn meta in scene metadata, `assertMayActThisRound` gate in submit, `recordTurnAction` in resolve transaction, `turn.round_advanced`/`turn.mode_changed` events), API `GET/PUT /scenes/:sceneId/turns` (PUT host-only), `TurnBar` UI with round status + host toggle. 4 new unit tests; all 31 tests + build clean.

- [x] C4. (2026-07-02) Scene scoping enforced server-side: new `scene-access.ts` (`sceneVisibilityWhere` filter — hosts see all, players see PUBLIC/PARTY + scenes they participate in; `assertSceneAccess` guard). Applied to `getCampaign` scene list, `getSceneState`, and `submitActionIntent` (with reservation release on denial). Unit tests added; all tests + build clean.

- [x] C3. (2026-07-02) Members bar on party campaign header: `members.ts` domain module (`listCampaignMembers` with viewer role + character names, `removeCampaignMember` host-only transaction cleaning up characters/markers/scene participants + `member.removed` event), API `GET /members` and `DELETE /members/:userId`, chip UI with host crown and two-step remove confirm. Tests + build clean.

- [x] C1+C2. (2026-07-02) Party campaigns + invite flow: `inviteCode` column on Campaign (pushed to Neon), `invites.ts` domain module (host-only code creation, public preview, join with membership + character + marker + scene participant + event, max-player cap), API routes `POST /api/campaigns/:id/invite` and `GET/POST /api/join/:code`, Solo/Party toggle at creation, Invite button (copies link) on party campaign header, `/join/[code]` page with preview + character naming. Tests + build clean.

- [x] B5+B6. (2026-07-02) Journal panel with Quests/Items tabs: new `GET /api/campaigns/:id/journal` route, `journal-panel.tsx` refreshing on `campaign-updated`, quest status/thread badges, item quantity ×N. Mobile gets a 4th "Journal" tab; desktop sidebar stacks Journal above Codex. Build + lints clean.

- [x] B4. (2026-07-02) Optional `characterName` (1–80 chars) added to all three `createCampaignSchema` variants, threaded through `seedGeneratedWorld` (character + map marker label) and the Gemini portrait prompt; UI input on new-campaign page for all modes, blank falls back to "Adventurer". Tests + build clean.

- [x] B3. (2026-07-02) New-campaign page now has Rough idea / Random / Custom mode tabs matching `createCampaignSchema`; random takes optional tone/genre, custom takes title/premise/setting/tone/genre with client-side validation mirroring the schema minimums. Build + lints clean.

- [x] B1+B2. (2026-07-02) Delete + export buttons on campaign cards (`campaign-card-actions.tsx`): two-step delete confirm calling `DELETE /api/campaigns/:id`, export via `GET /api/campaigns/:id/export` download link. Build + lints clean.
- [x] A2. (2026-07-02) Merged PR #3 to master (Vercel check green, merge state CLEAN). Visual test-plan items best verified on the live deploy.
- [x] A1. (2026-07-02) Resolved PR #3 merge conflicts against master. Kept mobile-first layouts, integrated Gemini `mapConfig` tiles, portrait markers, and landscape image into both mobile and desktop views. Build + all unit tests pass. Pushed `6ec0a30`, PR marked ready for review.
