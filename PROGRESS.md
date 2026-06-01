# Rhyzzle — Progress Log

Every Claude Code session must append a new entry to this file before finishing.

---

## Session 1 — 2026-06-01

**Goal:** Create the complete project foundation. Nothing existed before this session.

**What was done:**

### Documentation
- Created `README.md` — setup instructions, project structure, commands
- Created `PRODUCT_BRIEF.md` — product vision, core loop, game modes, principles, MVP scope
- Created `ARCHITECTURE.md` — tech stack, data model, route overview, state machine, auth strategy
- Created `ROADMAP.md` — Phases 0–6 with full task breakdowns
- Created `TASKS.md` — actionable task list with status labels, acceptance criteria, and file references
- Created `PROGRESS.md` (this file)
- Created `DECISIONS.md` — 10 key product and technical decisions documented
- Created `AGENTS.md` — permanent instructions for future Claude Code sessions

### Configuration
- Created `package.json` — Next.js 15, TypeScript, Tailwind, Prisma, all deps
- Created `tsconfig.json` — strict TypeScript config
- Created `next.config.ts` — minimal Next.js config
- Created `tailwind.config.ts` — dark theme, mobile-first config
- Created `postcss.config.mjs` — Tailwind postcss setup
- Created `.env.example` — all required environment variables documented
- Created `.gitignore` — Node, Next.js, Prisma, env files excluded

### Database Schema
- Created `prisma/schema.prisma` — full schema with 20+ models:
  - `User`, `GuestUser` — auth (real + guest)
  - `Group`, `GroupMember` — crew rooms (future)
  - `Beat` — audio tracks
  - `Challenge`, `ChallengeRule`, `RequiredWord` — challenge system
  - `Room`, `RoomParticipant` — room sessions
  - `Submission`, `SubmissionLine` — bars + lines
  - `Vote`, `Like`, `Comment`, `Save`, `ShareEvent` — engagement
  - `DailyChallenge` — daily game
  - `HighlightSpan`, `ConstraintResult` — Phase 5 AI highlighting (designed now, used later)

### Sample Data
- Created `lib/sample-data.ts` — 5 sample beats, 10 challenge templates (4-bar, 6-bar, 8-bar), 1 test room
- Created `prisma/seed.ts` — database seeder

### App Pages (Placeholder UI)
- Created `app/layout.tsx` — root layout with dark theme
- Created `app/globals.css` — Tailwind base + CSS vars
- Created `app/page.tsx` — landing page: pitch, CTA, how-it-works steps
- Created `app/create/page.tsx` — create room form (beat, bar count, rules, privacy)
- Created `app/room/[roomCode]/page.tsx` — room experience with state machine (LOBBY/WRITING/VOTING/REVEAL)
- Created `app/daily/page.tsx` — daily challenge placeholder
- Created `app/discover/page.tsx` — discover feed placeholder
- Created `app/profile/page.tsx` — profile placeholder

### API Route Stubs
- Created `app/api/rooms/route.ts` — POST create room
- Created `app/api/rooms/[roomCode]/route.ts` — GET room state
- Created `app/api/rooms/[roomCode]/join/route.ts` — POST join room
- Created `app/api/rooms/[roomCode]/submit/route.ts` — POST submit bars
- Created `app/api/rooms/[roomCode]/vote/route.ts` — POST cast vote

### Components
- Created `components/beat-player.tsx` — audio beat player
- Created `components/bar-editor.tsx` — line-by-line bar writing editor
- Created `components/challenge-card.tsx` — challenge rules display

### Lib
- Created `lib/types.ts` — all shared TypeScript types and DTOs
- Created `lib/utils.ts` — room code generation, score calculation, cn() helper

**Status after this session:**
Phase 0 complete. App runs (`pnpm dev`) and shows placeholder UI. Database schema is ready but database is not yet connected (requires `.env.local` with `DATABASE_URL`). All foundation docs are in place. All future sessions should read AGENTS.md first.

**Next 5 tasks (Phase 1):**
1. Connect a local PostgreSQL database and run `pnpm db:push`
2. Run `pnpm db:seed` to load sample beats and challenges
3. Implement `POST /api/rooms` — create room, persist to DB, return roomCode
4. Make `/create` form functional (fetch beats from DB, submit creates room)
5. Implement `POST /api/rooms/[roomCode]/join` and make LOBBY state work with real data

---

*Append new entries below as work continues.*

---

## Session 2 — 2026-06-01

**Goal:** Fix "Room not found" bug — make create → room flow work end to end.

**Root cause diagnosed:**
- `POST /api/rooms` was generating a room code but never persisting anything (placeholder stub).
- `GET /api/rooms/[roomCode]` was hardcoded to only recognize `"TEST1"`. Any other code returned 404.
- No database connected (`.env.local` missing), so DB operations weren't possible yet.

**What was done:**

- Created `lib/room-store.ts` — in-memory global Map as a dev bridge. Rooms persist across requests for the lifetime of the dev server process. Clearly labeled as dev-only; to be replaced with Prisma calls once DB is set up.
- Rewrote `app/api/rooms/route.ts` — validates beat/challenge IDs, generates unique code, builds full `RoomStateDTO`, saves to store, returns `{ roomCode, roomId }`.
- Rewrote `app/api/rooms/[roomCode]/route.ts` — looks up room code in store (uppercased), returns 404 only for truly unknown codes.
- Rewrote `app/api/rooms/[roomCode]/join/route.ts` — looks up room, adds participant to store, sets session + participant cookies.
- Updated `DECISIONS.md` — documented in-memory store decision and canonical `roomCode` field.
- Updated `TASKS.md` — marked 6 Phase 1 tasks as DONE.

**Verified working:**
- `POST /api/rooms` → `{ roomCode: "WS9VA", roomId: "room_WS9VA" }`
- `GET /api/rooms/WS9VA` → full room JSON (200)
- `GET /api/rooms/FAKEX` → 404

**Status after this session:**
Create → redirect → room page loads the correct room. LOBBY state visible. Participants can join. Full flow unblocked without requiring a database.

**Next 5 tasks:**
1. Connect PostgreSQL: copy `.env.example` → `.env.local`, fill `DATABASE_URL`, run `pnpm db:push && pnpm db:seed`
2. Replace room-store calls with real Prisma operations in all three API routes
3. Implement WRITING state — host advances room, bar editor + beat player active
4. Implement `POST /api/rooms/[roomCode]/submit` — save bars to store/DB
5. Implement VOTING state — anonymous submissions, vote button
