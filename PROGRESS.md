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

## Session 5 — 2026-06-01

**Goal:** Redesign the WRITING state UI to feel like a premium mobile rap puzzle game.

**What was done:**

- `components/lyric-canvas-editor.tsx` — **new component.** Single `<textarea>` with a left line-number gutter. Both use `line-height: 1.75rem` and matching vertical padding so gutter numbers align to textarea rows. Progress dots footer (filled = bar written). Real-time bar count validation (`N / barCount`). Turns green border when valid, shows amber note when too few/many bars.
- `components/highlight-legend.tsx` — **new component.** Color guide card showing dot or dashed-underline indicator for each future highlight category (setup rhyme, internal rhyme, metaphor, punchline, callback, required word, needs fixing). Labeled "coming soon" since AI analysis isn't wired yet.
- `components/beat-player.tsx` — **complete visual redesign.** Dark gradient card with violet artwork placeholder, BPM + genre + LOOP badges, fake waveform (32 bars that fill violet as the track plays), invisible `<input type=range>` overlay for seeking, time display. All audio logic (play/pause, timeupdate, seek) preserved unchanged.
- `components/challenge-card.tsx` — **complete visual redesign.** Each rule now has a colored numbered circular badge (yellow = end rhyme, cyan = internal rhyme, green = metaphor, purple = punchline, pink = callback, amber = required word, etc.) matching the future highlight color system. Required words shown as amber caps chips.
- `app/room/[roomCode]/page.tsx` — **WritingView redesigned end-to-end:**
  - State: `bars: string[]` → `lyricsText: string` (single string, split on submit)
  - `handleSubmit`: splits `lyricsText` by `\n`, trims, filters empty lines → sends `{ lines }` array to the existing submit API (no API change)
  - `WritingView`: phased header with pulsing amber dot, `BeatPlayer`, `ChallengeCard`, optional required word strip, `LyricCanvasEditor`, `HighlightLegend`, fixed sticky submit button with violet gradient and gradient fade background
  - Submit button disabled until `nonEmptyCount === barCount`; validation note shown inline above button
  - Submitted/waiting card redesigned: progress bar, beat player stays visible while waiting
  - `fetchRoom` deps cleaned up (removed stale `bars.length` dep)
- `DECISIONS.md` — documented lyric canvas design choice

**TypeScript:** `pnpm tsc --noEmit` — clean, no errors.
**Build:** `pnpm next build` — compiles cleanly, `/room/[roomCode]` page = 7.25 kB.

**Status after this session:**
WRITING state looks and feels like a premium mobile game. Lyric canvas replaces individual input boxes. All existing game flow (LOBBY → WRITING → SUBMIT → WAITING, refresh persistence, host/guest behavior) is preserved.

**Next 5 tasks:**
1. VOTING state — host "End Writing" button (WRITING → VOTING), show anonymous submissions, one vote per participant
2. `POST /api/rooms/[roomCode]/vote` — store vote in submission store, prevent double-voting
3. REVEAL state — sort by votes, show winner, de-anonymize names
4. Connect PostgreSQL: `.env.local` → `pnpm db:push` → `pnpm db:seed`
5. Replace in-memory store with real Prisma operations

---

## Session 4 — 2026-06-01

**Goal:** Build LOBBY → WRITING → SUBMIT BARS → WAITING slice.

**What was done:**

- `lib/types.ts` — added `currentParticipantHasSubmitted: boolean` to `RoomStateDTO`
- `lib/room-store.ts` — added `StoredSubmission` interface and submission store (second global `Map`, keyed by `ROOMCODE:participantId`); added `saveSubmission`, `getSubmission`, `hasParticipantSubmitted`, `getSubmissionsForRoom` exports
- `app/api/rooms/[roomCode]/start/route.ts` — new route; POST, host-only; 403 for non-host; 404 for unknown room; idempotent if already started; advances LOBBY → WRITING via `updateRoom`
- `app/api/rooms/[roomCode]/submit/route.ts` — fully implemented; validates room status (must be WRITING), deduplicates (409 on second attempt), saves to submission store, marks `hasSubmitted: true` on participant, increments `submittedCount`
- `app/api/rooms/[roomCode]/route.ts` — GET now returns `currentParticipantHasSubmitted` by querying submission store
- `app/api/rooms/route.ts` — added `currentParticipantHasSubmitted: false` to initial room state to satisfy TypeScript
- `app/room/[roomCode]/page.tsx`:
  - Added `isStarting` state and `handleStart()` — POSTs to `/start`, then refreshes room
  - Added `useEffect` that hydrates `hasSubmitted` from `roomState.currentParticipantHasSubmitted` — refresh-safe
  - Replaced host controls placeholder in `LobbyView` with real green "Start Game →" button
  - `LobbyView` now accepts `onStart` + `isStarting` props

**Verified at API level:**
- `POST /api/rooms/CODE/start` → `{ status: "WRITING" }`, room advances
- `POST /api/rooms/CODE/start` (non-host) → 403
- `POST /api/rooms/CODE/start` (already WRITING) → idempotent `{ status: "WRITING" }`
- `POST /api/rooms/CODE/submit` → `{ submissionId }`, `submittedCount` increments
- `GET /api/rooms/CODE` after submit → `currentParticipantHasSubmitted: true`
- `POST /api/rooms/CODE/submit` (duplicate) → 409

**Status after this session:**
Full LOBBY → WRITING → SUBMIT → WAITING flow is functional. Submitted state survives page refresh. Host sees "Start Game →" button; guests see "Waiting for host to start." TypeScript passes clean.

**Next 5 tasks:**
1. Implement VOTING state — host "End Writing" button (WRITING → VOTING), show anonymous submissions, one vote per participant
2. Implement `POST /api/rooms/[roomCode]/vote` — store vote, prevent double-voting
3. Implement REVEAL state — sort by votes, show winner, de-anonymize names
4. Connect PostgreSQL: `.env.local` → `pnpm db:push` → `pnpm db:seed`
5. Replace in-memory store with real Prisma operations

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

---

## Session 3 — 2026-06-01

**Goal:** Fix create-room UX — host should land directly in the room lobby, not see a join form.

**Root cause diagnosed:**
- `/create` had no nickname field — host had no identity
- `POST /api/rooms` never created a host participant and never set session cookies
- `GET /api/rooms/[roomCode]` never read cookies, so `currentParticipantId` was always null
- Room page's `hasJoined` state started `false` on every load — every visitor (including the host) saw the join form

**What was done:**

- `lib/types.ts` — added `hostNickname: string` to `CreateRoomRequest`; added `hostParticipantId` to `CreateRoomResponse`; added `currentParticipantId: string | null` to `RoomStateDTO`
- `app/api/rooms/route.ts` — accepts `hostNickname`; creates host `RoomParticipant` (isHost: true) as the first participant; sets `rhyzzle_session` + `rhyzzle_participant` cookies on the create response
- `app/api/rooms/[roomCode]/route.ts` — reads `rhyzzle_participant` cookie from request; finds matching participant in room; returns `currentParticipantId` and `isHost` per-requester (not stored in room state)
- `app/create/page.tsx` — added "Your Name" input field (required, autofocused); sends `hostNickname` in POST body; button disabled until name is entered; summary card shows host name
- `app/room/[roomCode]/page.tsx` — added `useEffect` that watches `roomState.currentParticipantId` and auto-sets `hasJoined=true` when non-null; split `LobbyJoinView` into `GuestJoinView` (for newcomers) and `LobbyView` (for everyone already in the room); `LobbyView` shows beat/challenge summary + share button + participant list

**Verified at API level:**
- `POST /api/rooms` → `{ roomCode, roomId, hostParticipantId }` + sets cookies
- `GET /api/rooms/YVGZA` with host cookie → `currentParticipantId: "p_YVGZA_host"`, `isHost: true`
- `GET /api/rooms/YVGZA` without cookie → `currentParticipantId: null`, `isHost: false`
- After guest joins → 2 participants, guest GET returns their own `currentParticipantId`

**Status after this session:**
Full create → room lobby flow works correctly. Host lands directly in lobby with their name, the share link, and the game summary. Guests see the join form. Refresh doesn't duplicate participants.

**Next 5 tasks:**
1. Add "Start Game" button for host → advances room from LOBBY → WRITING
2. Implement `POST /api/rooms/[roomCode]/submit` — save bars to store, track submitted count
3. Implement WRITING state fully — beat player + challenge card + bar editor functional
4. Implement VOTING state — anonymous submissions displayed, one vote per participant
5. Implement REVEAL state — show winner, de-anonymize names
