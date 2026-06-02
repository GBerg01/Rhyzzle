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

## Session 12 — 2026-06-02

**Goal:** Improve error recovery for the solo play → Challenge Friends → room creation flow. Prevent users from getting stuck after a failed API call. Improve server-side error messages.

**What was done:**

### `app/api/rooms/route.ts`
- Replaced generic `"Internal server error"` catch with specific cases:
  - Prisma P2002 (unique constraint): `"Room code collision — please try again"`
  - Prisma P1001/P1017 (DB unreachable/closed): `"Database connection failed — check the DB is running"`
  - In development (`NODE_ENV === "development"`): returns the real `err.message` so the exact failure is visible
  - Production fallback: `"Failed to create challenge room — please try again"` (actionable, not opaque)
- Server-side log unchanged: full error still logged via `console.error`

### `app/play/[barCount]/page.tsx`
- Replaced flat error `<p>` with a full recovery card when `challengeError` is set:
  - Shows real API error message (already surfaced from the server)
  - "Try Again" button — calls `handleChallengeFriends()` directly (function already clears error state at top)
  - "Start Fresh →" link to `/play` — exits the flow cleanly
  - Dev-only note (guarded by `process.env.NODE_ENV === "development"`): "Local dev: if you recently reset the DB, try a fresh incognito window or restart pnpm dev."
- When no error: normal "Challenge Friends →" button is shown (unchanged behavior)
- TypeScript: clean

### Ranked voting clipboard fixes (carried over from previous session)
- `WritingView.handleShareChallenge` — replaced raw `navigator.clipboard.writeText` with `copyToClipboard` helper; added `shareCopyFailed` state; fallback message shown below button
- `ChallengeLiveView.handleShareLink` — same fix
- `RevealView` — fixed missing `copyFailed` prop in destructure (TypeScript was catching `copyFailed` as undeclared)

**TypeScript:** `pnpm tsc --noEmit` — clean.

**What was made recoverable:**
- Failed Challenge Friends API call no longer leaves the user stuck on a red message with no escape
- Server errors in development now surface the real cause instead of "Internal server error"
- DB connection failures get their own message instead of a generic 500

**What we are intentionally not over-optimizing:**
- Stale `rhyzzle_participant` cookies: these are `httpOnly` (JS can't clear them), and they already degrade gracefully — GET room returns `currentParticipantId: null` → user sees join form. No crash.
- Challenge Friends retry doesn't clear the name input — intentional, user typed it once.
- No deep Prisma error class imports — we check `(err as any).code` string, which covers the real-world failure cases without extra deps.

---

## Session 11 — 2026-06-01

**Goal:** Replace the state-machine voting model for Challenge Links with a "live all day, locks at 9 PM" timing model.

**Key product correction:** Challenge Links should never require a manual "Start Voting" step. Submissions and voting are open from room creation until `locksAt`. Votes can be changed before lock. Final results appear automatically after lock.

**What was done:**

### `lib/utils.ts`
- Added `getDefaultLocksAt()` — returns next 9 PM as ISO timestamp. If 9 PM has already passed today, returns tomorrow 9 PM. Uses Node.js process timezone (set `TZ` env var for consistent server behavior).

### `lib/types.ts`
- Added `locksAt: string | null` to `RoomStateDTO` — ISO timestamp stored at creation; null for GROUP_ROOM.
- Added `isLocked: boolean` — always `false` in stored state; GET recomputes dynamically from `locksAt`.
- Added `currentParticipantVotedForId: string | null` — which submissionId this participant voted for; null in stored state; GET computes per-requester. Enables vote-change UI.

### `lib/room-store.ts`
- Added `getVoteForParticipant(roomCode, participantId)` — returns the participant's current vote (for `currentParticipantVotedForId`).

### `app/api/rooms/route.ts`
- For CHALLENGE_LINK: imports and calls `getDefaultLocksAt()`, stores as `locksAt` in room state.
- Initializes `isLocked: false` and `currentParticipantVotedForId: null` in stored state.

### `app/api/rooms/[roomCode]/route.ts` (GET)
- Computes `isLocked = Date.now() >= new Date(locksAt)` for CHALLENGE_LINK rooms.
- Computes `currentParticipantVotedForId` from vote store.
- For CHALLENGE_LINK: always builds `submissions` (regardless of room status), anonymous before lock, named + vote counts after lock, winner marked after lock.
- GROUP_ROOM submission building unchanged (VOTING/REVEAL states).

### `app/api/rooms/[roomCode]/submit/route.ts`
- For CHALLENGE_LINK: checks `isLocked` instead of `status === "WRITING"`. Error: "Today's Rhyzzle is locked. Final results are live."
- For GROUP_ROOM: unchanged (status check preserved).

### `app/api/rooms/[roomCode]/vote/route.ts`
- For CHALLENGE_LINK: checks `isLocked`; removes double-vote 409 (votes can be changed — `saveVote` overwrites same key).
- For GROUP_ROOM: unchanged (status check + double-vote prevention preserved).

### `app/api/rooms/[roomCode]/start-voting/route.ts`
- For CHALLENGE_LINK: returns graceful 200 message "Challenge Links are live all day."
- For GROUP_ROOM: host-only state transition preserved.

### `app/room/[roomCode]/page.tsx`
- Added `formatLockTime(locksAt)` helper — formats ISO timestamp to "9 PM" / "8:30 PM" in browser local time.
- Added `currentParticipantVotedForId` hydration effect — initializes `selectedSubmissionId` on page load from server.
- Main render: CHALLENGE_LINK rooms route to `ChallengeLinkView`; GROUP_ROOM uses existing state machine.
- **Removed:** `WritingJoinView`, `VotingLateJoinView` (replaced by new components).
- **Simplified:** `LateArrivalView` — now GROUP_ROOM only, no `roomMode` prop.
- **New:** `ChallengeLinkView` — wrapper routing `isLocked → ChallengeFinalView`, `!hasJoined → ChallengeLinkJoinView`, `!hasSubmitted → writing board`, `hasSubmitted → ChallengeLiveView`.
- **New:** `ChallengeLinkJoinView` — "Submit and vote before 9 PM" join form.
- **New:** `ChallengeLiveView` — post-submit view: live status card, anonymous voting cards, "Cast Vote" / "Change Vote →", "Votes can change until results lock" note, share card.
- **New:** `ChallengeFinalView` — final results after lock: winner, ranked submissions with names + vote counts, "Play Today's Rhyzzle →", "Start New Challenge" CTAs.
- Nav badge: "Live" (green pulse) / "Locked" (grey) for CHALLENGE_LINK; existing status badge for GROUP_ROOM.

**TypeScript:** `pnpm tsc --noEmit` — clean, no errors.

**Status after this session:**
Challenge Links are now live all day. Creator sends link → friends join any time → write bars any time → vote any time → vote can be changed before 9 PM → final results show automatically after lock. No "Start Voting" button. No host dependency. Group Rooms are completely unchanged.

**Next 5 tasks:**
1. End-to-end QA: solo play → challenge friends → friend joins → both write → vote + change vote → verify final results after lock
2. Connect PostgreSQL: `.env.local` → `pnpm db:push` → replace in-memory store with Prisma
3. Make BeatPlayer functional with real audio file
4. Persist solo daily entries server-side (bars currently lost on navigate before Challenge Friends)
5. Test GROUP_ROOM flow end-to-end to verify state machine still works

---

## Session 10 — 2026-06-01

**Goal:** Remove host dependency for Challenge Link rooms. Any submitted participant can start voting once 2+ submissions exist.

**What was done:**

### `lib/types.ts`
- Added `RoomMode = "CHALLENGE_LINK" | "GROUP_ROOM"` type
- Added `roomMode: RoomMode` field to `RoomStateDTO` — stored at creation, returned by GET

### `app/api/rooms/route.ts`
- Sets `roomMode: "CHALLENGE_LINK"` when `source === "CHALLENGE_LINK"`, `roomMode: "GROUP_ROOM"` otherwise

### `app/api/rooms/[roomCode]/start-voting/route.ts`
- Rewritten authorization: reads `room.roomMode`
- `CHALLENGE_LINK`: any joined participant who has submitted can start voting (403 if not submitted)
- `GROUP_ROOM`: host-only (existing behavior preserved)
- Both: require ≥ 2 submissions and WRITING state

### `app/room/[roomCode]/page.tsx`
- `WritingView` receives two new props: `roomMode` and `roomCode`
- `canStartVoting` now computed per room mode: challenge = any submitted participant at 2+; group = host only at 2+
- **Waiting state — Challenge Link:**
  - When `submittedCount < 2`: shows share card with room URL, "Send to Group Chat" button, copy text "Think you can beat me?"
  - When `submittedCount >= 2`: shows "Vote who cooked" prompt + "Start Voting →" button (to any submitted participant)
- **Waiting state — Group Room:** unchanged (host-only "Start Voting →" at 2+ submissions)
- `WritingJoinView` shows "challenged you" copy with beat info and "Write Your Bars →" CTA

**TypeScript:** `pnpm tsc --noEmit` — clean.

**Status after this session:**
Challenge link rooms no longer depend on the creator staying active. Once a friend submits, either the creator or the friend can tap "Start Voting →". Group room host-only behavior is unchanged.

**Next 5 tasks:**
1. Connect PostgreSQL: `.env.local` → `pnpm db:push` → replace in-memory store
2. Make BeatPlayer functional with a real audio file
3. End-to-end QA: solo play → challenge friends → second window joins → both submit → friend starts voting → reveal
4. Persist solo daily entries (so bars survive navigation before Challenge Friends)
5. Voting reveal: show submitted participant names correctly in REVEAL state for challenge links

---

## Session 9 — 2026-06-01

**Goal:** Implement the Daily Play → Challenge Friends flow. Users write solo first, then optionally challenge friends. Remove the "create room before writing" friction from the primary path.

**What was done:**

### `lib/daily-challenge.ts`
- Added `variantToChallengeDTO(variant)` — converts `DailyChallengeVariant` → `ChallengeDTO` (the shape used by `LyricPuzzleCanvas` and the room store). Used by both the solo daily play page and the API.

### `lib/types.ts`
- `CreateRoomRequest.source` — added `"CHALLENGE_LINK"` as a valid value (alongside `"DAILY_CHALLENGE"`)
- `CreateRoomRequest.submittedBars?: string[]` — new field: creator's already-written bars, saved as their first submission when a CHALLENGE_LINK room is created

### `app/api/rooms/route.ts`
- `source: "CHALLENGE_LINK"` path: creates room with `status: "WRITING"` (skips LOBBY), marks host as `hasSubmitted: true`, sets `submittedCount: 1`, and immediately calls `saveSubmission()` with the creator's bars. Challenge link rooms start ready for friends to join and write.
- `source: "DAILY_CHALLENGE"` path: unchanged — creates room in LOBBY state
- Legacy `beatId`/`challengeId` path: unchanged

### `app/play/page.tsx`
- Mode cards (3/6/8) now link to `/play/N` instead of `/create?barCount=N`

### `app/play/[barCount]/page.tsx` — **new file**
- Solo daily writing experience. No account or room required.
- Validates `barCount` param (must be 3, 6, or 8)
- Uses `getDailyVariant(barCount)` + `variantToChallengeDTO()` to build the `ChallengeDTO`
- Shows `BeatPlayer` (today's beat) + `LyricPuzzleCanvas` (full puzzle board with rule chips)
- Sticky "Submit Bars 🔥" button — disabled until all bars are filled
- On submit: transitions to post-submit screen (no API call for solo play)
- **Post-submit screen:**
  - Shows submitted bars preview
  - Name input field (required for Challenge Friends)
  - **Primary CTA:** "Challenge Friends →" — POSTs `source: "CHALLENGE_LINK"` to API, redirects to `/room/[roomCode]`
  - **Secondary:** "Copy Result" — copies bars + share link to clipboard
  - **Secondary:** "Start Group Room" — links to `/create?barCount=N`
  - **Secondary:** "← Back Home"

### `app/room/[roomCode]/page.tsx`
- **WRITING + not-joined gate (new):** When `status === "WRITING"` and `!hasJoined`, renders `WritingJoinView` instead of `WritingView`. Enables friends to join a challenge link room directly in WRITING state.
- **`WritingJoinView` (new component):** Shows challenger's name ("Grayson challenged you"), beat info, name input, "Write Your Bars →" CTA. Falls back to generic copy if no host name.
- **`GuestJoinView` props updated:** `challengeTitle` → `barCount` (more useful display). Shows host's name when available.
- **`handleShare` updated:** Share text now reads "Grayson finished today's Rhyzzle. Think you can beat them?" — challenge framing, not room management.
- **LobbyView share button:** "Send to Group Chat" (was "Invite friends — tap to copy link")
- **CLOSED state + RevealView CTAs:** Now link to `/play` ("Play Today's Rhyzzle" / "Play Again →") instead of `/create`
- **barLines init `useEffect`:** Now requires `hasJoined` to prevent initializing the writing state for un-joined friends

**TypeScript:** `pnpm tsc --noEmit` — clean, no errors.
**Routes:** All three routes (/, /play, /play/6) return 200.

**Status after this session:**
Full daily-first flow is working. User can go Home → Play Today → pick 3/6/8 → write bars solo → submit → challenge friends (creates CHALLENGE_LINK room, submits their bars immediately) → friends open link → join with name → write bars → host starts voting → reveal. Start Group Room still works as a secondary path from both Home and the post-submit screen.

**Next 5 tasks:**
1. Connect PostgreSQL: `.env.local` → `pnpm db:push` → `pnpm db:seed`
2. Replace in-memory stores with Prisma (rooms, submissions, votes)
3. Make BeatPlayer functional with real audio
4. End-to-end QA: solo play → challenge friends → 2+ friends join → write → vote → reveal
5. CLOSED state / "Play Again" flow

---

## Session 8 — 2026-06-01

**Goal:** Make rule chips in the puzzle board interactive — tapping opens a help sheet with definition, example, and tip.

**What was done:**

- `lib/rule-help.ts` — **new file.** Centralized rule education map. `RuleHelpKey` union type (13 keys). `RuleHelp` interface with `label`, `chipClass`, `textClass`, `shortDefinition`, `example`, `tip`. `RULE_HELP` record with full definitions for: SETUP_RHYME, END_RHYME, RHYME_WITH_LINE, INTERNAL_RHYME, CHAIN_RHYME, METAPHOR, THEME_REFERENCE, PUNCHLINE, CALLBACK, ALLITERATION, ASSONANCE, REQUIRED_WORD, WRITE.

- `components/rule-help-sheet.tsx` — **new component.** Fixed bottom sheet. Backdrop (tap to dismiss) + white panel with drag handle, colored badge, definition, example block, 💡 tip, "Got it" button. Closes on Escape key. No external dependencies.

- `components/lyric-puzzle-canvas.tsx` — updated:
  - `ChipData` interface: added `helpKey: RuleHelpKey`
  - `ruleToChip()`: added `helpKey` for all 10 explicit ConstraintType cases
  - `buildMeta()`: added `helpKey` to all three chip paths (explicit rule, inferred rhyme, SETUP RHYME)
  - Added `useState<RuleHelpKey | null>` for `activeHelpKey`
  - Added `openHelp(helpKey, e)` — calls `e.preventDefault()` + `e.stopPropagation()`, sets active key
  - Rule chips changed from `<span>` to `<button type="button">` with `active:scale-95` and `?` suffix
  - Required word chips changed from `<span>` to `<button>` that opens `REQUIRED_WORD` help
  - `RuleHelpSheet` rendered at bottom of component, bound to `activeHelpKey`

**TypeScript:** `pnpm tsc --noEmit` — clean.
**Build:** `pnpm next build` — clean. `/room/[roomCode]` page = 11.5 kB (rule content included in bundle).

**Status after this session:**
Every rule chip in the writing canvas is now tappable. Tapping opens a bottom sheet explaining the rule with a plain-English definition, example, and quick tip. Works on mobile and desktop. Dismiss by tapping the backdrop, pressing Escape, or hitting "Got it".

**Next 5 tasks:**
1. Connect PostgreSQL: `.env.local` → `pnpm db:push` → `pnpm db:seed`
2. Replace in-memory stores with real Prisma operations
3. Make BeatPlayer functional with real audio
4. End-to-end integration test (create → join → write → vote → reveal)
5. Daily challenge page (Phase 3)

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
