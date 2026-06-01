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

## Session 7 — 2026-06-01

**Goal:** Complete the full private room game loop: WRITING → VOTING → REVEAL.

**What was done:**

### `lib/room-store.ts`
- Added `StoredVote` interface (`voteId`, `participantId`, `submissionId`, `roomCode`, `votedAt`)
- Added `global.__rhyzzleVotes` Map (survives HMR, same pattern as rooms/submissions)
- Added exports: `saveVote`, `hasParticipantVoted`, `getVotesForRoom`, `getVoteCountsForRoom`

### `lib/types.ts`
- `SubmissionDTO`: added `isOwnSubmission?: boolean` (server-computed per-requester), comments on anonymization
- `RoomStateDTO`: added `currentParticipantHasVoted: boolean` and `votedCount: number`

### `app/api/rooms/[roomCode]/route.ts` — GET fully updated
- Reads `rhyzzle_participant` cookie to compute `currentParticipantHasVoted`
- Computes `votedCount` from voteStore on every GET (live count, no caching)
- In VOTING state: builds anonymous `SubmissionDTO[]` — `participantId: ""`, `nickname: null`, `voteCount: 0`, `isOwnSubmission` set per-requester
- In REVEAL state: builds full `SubmissionDTO[]` — real `participantId`, real `nickname`, real `voteCount`, `isWinner: true` for max-vote holders

### `app/api/rooms/[roomCode]/start-voting/route.ts` — new
- POST, host-only (403 non-host), idempotent check (WRITING only), needs ≥2 submissions (400 otherwise)
- Transitions room to VOTING via `updateRoom`

### `app/api/rooms/[roomCode]/vote/route.ts` — rewritten from stub
- Full implementation: room must be VOTING, participant must be in room, no double-vote (409), no self-vote (400), submission must exist in room (404)
- Saves vote with `saveVote`

### `app/api/rooms/[roomCode]/reveal/route.ts` — new
- POST, host-only (403 non-host), room must be VOTING, needs ≥1 vote (400 otherwise)
- Transitions room to REVEAL via `updateRoom`

### `app/api/rooms/route.ts`
- Added `currentParticipantHasVoted: false` and `votedCount: 0` to initial room state (satisfies TypeScript)

### `app/room/[roomCode]/page.tsx` — updated throughout
- Added `isStartingVoting`, `isRevealing` state
- Added `handleStartVoting()`, `handleReveal()` async functions
- Added `hasVoted` hydration effect from `roomState.currentParticipantHasVoted`
- `WritingView` waiting state: host sees "Start Voting →" button when ≥2 submissions; guests see waiting message; both see submission progress bar
- `VotingView`: full rewrite — anonymous card per submission (labeled A/B/C), own submission card disabled with "Your submission" label, selected card highlighted amber, blue gradient "Cast Vote" button, host sees "Reveal Winner 👑" button in a host controls panel (requires ≥1 vote), voted state shows waiting screen
- `RevealView`: full rewrite — winner shown in amber card, tied winners all shown, runner-ups listed with vote counts, "Share Results" + "Create New Room" action buttons, tie handling ("It's a tie!")

**TypeScript:** `pnpm tsc --noEmit` — clean, no errors.
**Build:** `pnpm next build` — clean. 4 new API routes visible in route table.

**Status after this session:**
Full game loop is complete. Host creates room → players join → host starts writing → players write bars → host starts voting → players vote anonymously → host reveals winner → reveal screen shows winner and all submissions with names. Refresh preserves all state (submitted, voted). Ties are handled. All validations enforced.

**Next 5 tasks:**
1. Connect PostgreSQL: `.env.local` → `pnpm db:push` → `pnpm db:seed`
2. Replace in-memory stores with real Prisma operations
3. Make BeatPlayer functional (real audio playback from beat URLs)
4. End-to-end integration test (create → 2+ users join → write → vote → reveal)
5. CLOSED state / "Play Again" flow

---

## Session 6 — 2026-06-01

**Goal:** Replace the single-textarea lyric canvas with a per-line puzzle board (Genius-inspired) that shows the full rhyme map before the user types anything.

**What was done:**

- `components/lyric-puzzle-canvas.tsx` — **new component.** Full puzzle board:
  - Color palette: 8 named colors (yellow, cyan, green, purple, pink, amber, orange, zinc), each with chip/text/row/gutter variants
  - Scheme letter → color mapping (A=yellow, B=purple, C=cyan, D=pink, E=green, F=orange, X=zinc)
  - Rule → chip data: `ruleToChip()` maps all ConstraintType values to label + color + placeholder
  - Rhyme scheme derivation: `deriveScheme()` — (1) explicit RHYME_SCHEME rule string → (2) infer from END_RHYME lineIndex/targetLine pairs → (3) default couplet AABBCCDD
  - Per-line metadata: `buildMeta()` — priority system (PUNCHLINE=10 → REQUIRED_WORD=1) picks best explicit rule per line; fallback to inferred rhyme chip or SETUP RHYME chip
  - Renders: scheme summary pills row → required words row → white canvas card
  - Each canvas row: colored gutter (44px, line number + scheme letter badge) + content area (rule chip + rhyme connector label + transparent `<input type="text">`)
  - Row tint: colored when empty, fades to white when user types (live)
  - Enter key advances focus to next input; Backspace on empty returns to previous
  - Footer: progress dots + "X / N bars" count

- `app/room/[roomCode]/page.tsx` — **WritingView wired to puzzle canvas:**
  - Imports: removed `LyricCanvasEditor`, `HighlightLegend`, `ChallengeCard`; added `LyricPuzzleCanvas`
  - State: `lyricsText: string` → `barLines: string[]`
  - New `useEffect`: initializes `barLines` to `Array(barCount).fill("")` when room enters WRITING and array is empty
  - New `handleBarLineChange(index, value)` — immutable update helper
  - `handleSubmit`: now reads from `barLines` instead of splitting a textarea string
  - `WritingView` props: `lyricsText`/`setLyricsText` → `barLines`/`onLineChange`
  - `WritingView` body: replaced `ChallengeCard` + required word strip + `LyricCanvasEditor` + `HighlightLegend` with single `LyricPuzzleCanvas`; validation now checks `barLines.every(l => l.trim())`; loading guard while `barLines.length < barCount`

**TypeScript:** `pnpm tsc --noEmit` — clean, no errors.
**Build:** `pnpm next build` — compiles cleanly, `/room/[roomCode]` page = 8.08 kB.

**Status after this session:**
WRITING state now shows the full colorful puzzle board immediately on load. Each bar line displays its scheme letter, rule chip, and placeholder before the user types. Row tints fade as bars are filled. Submit flow unchanged — still POSTs `{ lines: string[] }` to the existing API.

**Next 5 tasks:**
1. VOTING state — host "End Writing" button (WRITING→VOTING), anonymous submission display, one vote per participant
2. `POST /api/rooms/[roomCode]/vote` — store vote, prevent double-voting
3. REVEAL state — sorted by votes, names revealed, share card
4. Connect PostgreSQL: `.env.local` → `pnpm db:push` → `pnpm db:seed`
5. Replace in-memory store with real Prisma operations

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
