# Rhyzzle — Decision Log

Use this file to record important product and technical decisions. Every major choice should be logged here so future sessions understand the reasoning and don't reverse decisions without context.

Format:
- **Date:** When the decision was made
- **Decision:** What was decided
- **Reason:** Why
- **Tradeoffs:** What was given up

---

## 2026-06-01 — Host is auto-joined into their own room on create

**Decision:** `POST /api/rooms` creates the host as the first `RoomParticipant` (isHost: true) and immediately sets `rhyzzle_session` + `rhyzzle_participant` cookies on the response. The creator is redirected directly into the room lobby — they never see a join form.

**Reason:** The product principle is "fastest possible flow." Making the host manually join their own room after creating it is friction and bad UX. The Jackbox / group-game mental model is: you create, you're in, then you invite friends. The share link lives inside the room lobby.

**Tradeoffs:** The host's session token is generated on create, not on join. This is fine — both paths produce the same result (a cookie that identifies the participant).

**How to apply:** `GET /api/rooms/[roomCode]` always reads the `rhyzzle_participant` cookie and returns `currentParticipantId`. The room page's `useEffect` watches this value and sets `hasJoined=true` when it's non-null, bypassing the join form for anyone who already has a valid session for this room.

---

## 2026-06-01 — In-memory room store as DB bridge (dev only)

**Decision:** Use a global `Map<string, RoomStateDTO>` in `lib/room-store.ts` as a temporary in-memory store for rooms during development, before PostgreSQL is connected.

**Reason:** The full create → room flow was broken because `POST /api/rooms` generated codes but never persisted anything, while `GET /api/rooms/[roomCode]` only served the hardcoded "TEST1" seed room. The user needed the flow working immediately without having to set up PostgreSQL first.

**Tradeoffs:** Rooms reset when the dev server restarts. Not suitable for production or multi-process deployments. Clearly labeled in code as dev-only with TODO comments pointing to the Prisma replacement. To be deleted once Phase 1 DB work is complete.

**When to remove:** Delete `lib/room-store.ts` and replace store calls with `prisma.room.findUnique/create` once `DATABASE_URL` is set and `pnpm db:push` has been run.

---

## 2026-06-01 — Canonical room code field is `roomCode` on the `Room` model

**Decision:** The shareable room code is stored in the `roomCode` field on the `Room` Prisma model (not `code`, `shareCode`, or anything else). All routes use `roomCode` consistently. Codes are uppercased on write and lookup.

**Reason:** `roomCode` is the field defined in `prisma/schema.prisma` with `@unique`. Using a consistent name avoids the class of bugs where create writes to one field and lookup reads from another. Uppercasing on both sides prevents case-sensitivity mismatches.

**How to apply:** `prisma.room.findUnique({ where: { roomCode: code.toUpperCase() } })`. `generateRoomCode()` in `lib/utils.ts` already returns uppercase.

---

## 2026-06-01 — Use Next.js App Router (not Pages Router)

**Decision:** Use Next.js 15 with the App Router.

**Reason:** App Router is the current Next.js standard. It enables React Server Components, better layouts, and cleaner colocation of routes with their server logic. Claude Code works well with this structure.

**Tradeoffs:** App Router has a steeper learning curve and some third-party libraries still expect Pages Router patterns. For a non-technical founder working with Claude Code, this is offset by cleaner, more modern code.

---

## 2026-06-01 — Guest-first authentication (no account required to play)

**Decision:** Use nickname + session cookie for MVP. No account required before writing.

**Reason:** The core product principle is "fastest possible flow: open link → hear beat → write bars → submit." Any account wall before writing loses participants and defeats the group-chat share mechanic.

**Tradeoffs:** Guest data is tied to a session cookie. If the user clears cookies or switches browsers, they lose their session. This is acceptable for MVP — the game session is short-lived anyway. Real accounts come in Phase 6.

---

## 2026-06-01 — Prisma + PostgreSQL (not Supabase client, not Drizzle)

**Decision:** Use Prisma ORM with PostgreSQL as the database.

**Reason:** Prisma provides type-safe database access that pairs extremely well with TypeScript and Claude Code. Schema migrations are explicit and reviewable. Prisma Studio is a useful visual tool for a non-technical founder to inspect data.

**Tradeoffs:** Prisma can be slightly heavier than Drizzle. Supabase client would give real-time out of the box, but adds vendor lock-in. Prisma + PostgreSQL is the most portable, understandable, and maintainable choice for this team.

---

## 2026-06-01 — Polling over WebSockets for MVP room sync

**Decision:** The room page polls `GET /api/rooms/[roomCode]` every 4 seconds instead of using WebSockets or SSE.

**Reason:** Polling is simple, reliable, and requires no infrastructure changes. The room experience is turn-based (not a chat), so a 4-second lag between state changes is acceptable. WebSockets add significant complexity and infrastructure requirements.

**Tradeoffs:** Room state changes can lag by up to 4 seconds. Players may see a brief delay when the host advances the room state. This is fine for MVP but should be replaced with SSE or WebSockets if users complain about the feel.

---

## 2026-06-01 — Short 5-character room codes (not UUIDs in URL)

**Decision:** Rooms are accessed at `/room/[5-char-code]` (e.g., `/room/XK9F2`) not `/room/[uuid]`.

**Reason:** Short room codes are easy to share verbally, easy to type on mobile, and look clean in share messages. The UUID is kept as the internal primary key.

**Tradeoffs:** 5-char alphanumeric codes (A-Z, 0-9, no ambiguous chars I/O/0/1) give ~36^5 = ~60 million combinations. This is more than sufficient for MVP. Collision checking is done on creation.

---

## 2026-06-01 — Static seeded beats for MVP (no producer uploads)

**Decision:** Beats are seeded as static files in `/public/beats/`. No producer upload flow in MVP.

**Reason:** Building a beat marketplace or upload flow is a significant distraction from the core game mechanic. The Beat model in Prisma is designed to support producer uploads later (artist, BPM, cover, tags, audio URL). For MVP, we use 5 sample beats.

**Tradeoffs:** Limited beat variety. All rooms use the same small beat library. This is intentional — validate the game mechanic before investing in content infrastructure.

---

## 2026-06-01 — Anonymous voting by default

**Decision:** During the voting phase, submissions are shown without author names. Voting mode defaults to ANONYMOUS.

**Reason:** Anonymous voting prevents social pressure from influencing votes ("I'll vote for my friend"). It forces evaluation based purely on the bars. This is a core product principle.

**Tradeoffs:** Hosts can optionally set `votingMode: OPEN` if they want names visible. The VotingMode enum supports both.

---

## 2026-06-01 — No AI scoring of creative quality

**Decision:** AI will not score, rank, or judge the quality of submissions. Humans vote.

**Reason:** Creative quality is subjective. AI scoring would feel arbitrary, undermine trust, and miss cultural context (slang, references, delivery style). The product is explicitly about human judgment. This is a core product principle.

**Tradeoffs:** AI may assist with objective detection (does this line end with a word that rhymes with the previous end-word?) but never with "who cooked." AI highlighting (Phase 5) detects patterns, not quality.

---

## 2026-06-01 — Pre-compute engagement and hot scores on Submission model

**Decision:** Store `engagementScore` and `hotScore` as columns on `Submission`, recomputed on every engagement event.

**Reason:** Computing these scores at query time for discovery ranking would require expensive aggregation joins. Pre-computing them allows fast indexed queries on the Discover feed.

**Tradeoffs:** Scores can be slightly stale between events. For MVP this is fine. A background job can recompute periodically if needed.

---

## 2026-06-01 — Design HighlightSpan and ConstraintResult now, use in Phase 5

**Decision:** Include `HighlightSpan` and `ConstraintResult` models in the initial schema even though they won't be populated until Phase 5.

**Reason:** Designing these now ensures the schema can support the highlighting system without a disruptive migration later. The models are ready; the population logic is just deferred.

**Tradeoffs:** Slight schema complexity upfront. Acceptable cost for avoiding a major migration later.

---

## 2026-06-01 — Lyric canvas: single textarea + left gutter (not separate input boxes)

**Decision:** The WRITING state bar editor uses one `<textarea>` for the full lyric text, with a separate non-interactive gutter div that renders line numbers 1–N aligned to each textarea row.

**Reason:** The original design was N individual `<textarea>` elements in separate boxes — this feels like a worksheet, not a lyric notebook. The product goal is to feel like a premium mobile game. One continuous canvas where the user writes freely, with the structure visible in the gutter, matches how real lyricists write (one page, not a form). It also eliminates the Enter-key focus-management complexity.

**How it works:** Both the gutter and the textarea use `line-height: 1.75rem` and `padding-top: 1rem`. The gutter renders N divs each `height: 1.75rem`, which aligns them to the corresponding textarea lines. State is stored as a single `string` (renamed from `bars: string[]`); on submit the string is split by `\n`, trimmed, and empty lines are filtered before being sent as the `lines: string[]` array to the submit API.

**Tradeoffs:** Line numbers desync if the user wraps a single bar across multiple visual lines (long text + narrow screen). Acceptable for now — rap bars are typically short, and the alignment holds at 390px width.

---

## 2026-06-01 — Rule education uses static definitions for MVP (no AI)

**Decision:** Rule chips in the puzzle canvas show a bottom sheet with a static definition, example, and tip when tapped. All content lives in `lib/rule-help.ts` as a plain TypeScript map keyed by `RuleHelpKey`.

**Reason:** Users tapping "METAPHOR" or "PUNCHLINE" don't know what to write. Static education content solves this without AI, without an API call, and without any latency. The content is curated once and applies to all challenges.

**Tradeoffs:** Definitions don't adapt to the specific challenge or beat. Examples are generic. For MVP this is fine — the point is "what does this rule type mean?" not "what should I write for this specific challenge?"

**How to apply:** When adding new ConstraintType values, add a corresponding entry to `lib/rule-help.ts` and a `helpKey` in `ruleToChip()` in the canvas component.

---

## 2026-06-01 — Voting in-memory, consistent with submission store

**Decision:** Votes are stored in a third global Map (`__rhyzzleVotes`) in `lib/room-store.ts`, keyed by `${ROOMCODE}:${participantId}`. One vote per participant per room.

**Reason:** The app is not yet connected to PostgreSQL. Keeping votes in the same in-memory pattern as rooms and submissions makes the whole WRITING→VOTING→REVEAL flow testable without a database. Clearly marked as a dev bridge to be replaced with Prisma `Vote` model operations.

**Tradeoffs:** Vote data resets on dev server restart. Fine for MVP testing.

**When to replace:** When PostgreSQL is connected (`pnpm db:push`), replace with `prisma.vote.create()` and `prisma.vote.findMany()` in the vote, start-voting, and reveal routes.

---

## 2026-06-01 — Vote counts hidden during VOTING, revealed at REVEAL

**Decision:** `GET /api/rooms/[roomCode]` returns `voteCount: 0` for all submissions during VOTING state. Real counts only appear in REVEAL.

**Reason:** Showing live vote counts during voting creates a bandwagon effect — later voters will pile onto the leader. Anonymous voting with hidden counts ensures each participant votes on the bars alone.

**Tradeoffs:** Participants can't see real-time vote progress during voting. Only the aggregate `votedCount` (how many people have voted) is shown.

---

## 2026-06-01 — isOwnSubmission computed server-side

**Decision:** Submissions in VOTING state have `isOwnSubmission: boolean` set by the server based on the `rhyzzle_participant` cookie, rather than exposing `participantId` to the client.

**Reason:** If we returned the real `participantId` in VOTING state, a client could compare it against `currentParticipantId` to identify their own submission — but they could also try to correlate other participants to submissions by watching who's joined. Keeping `participantId` as an empty string during VOTING and using a server-computed `isOwnSubmission` field is cleaner and safer.

---

## 2026-06-01 — Tie handling: show all tied winners

**Decision:** If multiple submissions share the highest vote count, all are shown as winners ("It's a tie!") in the REVEAL screen. No tiebreaker logic.

**Reason:** Tiebreakers add complexity and subjective rules. Showing multiple winners is the most honest and lowest-friction MVP behavior.

---

## 2026-06-01 — Daily Play first, Challenge Friends second, Group Room third

**Decision:** The primary product flow is: write solo → challenge friends → group rooms are secondary. Users are not forced to create a room or join a group before writing.

**Reason:** Forcing room creation before writing added unnecessary friction. The product feels like a daily puzzle (Wordle model), not an event-planning tool. The new hierarchy: (1) Daily Entry — personal attempt, no room required; (2) Challenge Link — lightweight temporary room created after submitting, seeded with the creator's bars; (3) Group Room — recurring crew, secondary path from Home and post-submit screen.

**Tradeoffs:** Solo daily entries are client-side only for MVP (no server persistence, lost on navigate). The bars are preserved in React state until the user creates a Challenge Link. If the user navigates away before challenging friends, bars are lost. Acceptable for MVP — the product flow validation matters more than perfect persistence.

**How to apply:** `/play/[barCount]` is the solo daily writing page. On submit, post-submit screen offers Challenge Friends (creates `CHALLENGE_LINK` room), Copy Result, Start Group Room, Back Home. `/create` remains available as the "Start Group Room" secondary flow.

---

## 2026-06-01 — Challenge Link voting is open to any submitted participant

**Decision:** In `CHALLENGE_LINK` rooms, any participant who has submitted their bars can trigger `POST /api/rooms/[roomCode]/start-voting`. In `GROUP_ROOM` rooms, only the host can start voting.

**Reason:** Challenge links are designed to work without the creator staying active. If the creator sends a link, closes their browser, and friends submit bars, the vote should be able to proceed. Making voting host-only for challenge links would break the use case — the "host" (creator) may never open the room again.

**How to apply:** The `RoomStateDTO` now carries a `roomMode: "CHALLENGE_LINK" | "GROUP_ROOM"` field stored at creation. `start-voting` reads this field to determine the authorization rule. The room page `WritingView` reads `roomMode` to decide who sees the "Start Voting" button and whether to show the share card (challenge links only).

---

## 2026-06-01 — Challenge Link timing model: live all day, locks at 9 PM

**Decision:** Challenge Link rooms do not use the WRITING → VOTING → REVEAL state machine. Instead, they use a `locksAt` timestamp (9 PM today, or tomorrow 9 PM if already past). Submissions and voting are open simultaneously from room creation until `locksAt`. After `locksAt`, everything locks and final results are shown automatically. No manual "Start Voting" step. No host dependency.

**Reason:** The state-machine model (WRITING → VOTING → REVEAL) was designed for synchronous group rooms where everyone is present at the same time. Challenge Links are asynchronous — people open the link hours apart. Forcing someone to "Start Voting" is a host-dependency problem: if the creator closes their browser, nobody can advance the room. The daily puzzle model (Wordle, NYT games) works because anyone can play at any time and results reveal at a fixed cutoff.

**How it works:**
- `locksAt` is set at room creation via `getDefaultLocksAt()` (next 9 PM in server timezone).
- `isLocked` is computed at every GET: `Date.now() >= new Date(locksAt).getTime()`.
- Submit API: CHALLENGE_LINK checks `isLocked` instead of `status === "WRITING"`.
- Vote API: CHALLENGE_LINK checks `isLocked`; removes double-vote check (votes can be changed by overwriting).
- `currentParticipantVotedForId` enables the client to show which submission the user already voted for.
- GROUP_ROOM: state machine completely unchanged.

**Vote changing:** For CHALLENGE_LINK, votes can be changed until `locksAt`. The vote store uses `ROOMCODE:participantId` as key — `saveVote` naturally overwrites. The UI shows "Change Vote →" when `hasVoted = true`. This prevents early votes from being "wasted" when better submissions arrive later.

**Timezone limitation:** `getDefaultLocksAt()` uses the Node.js server process timezone. Set `TZ=America/New_York` (or equivalent) in production `.env`. The client displays the time in the user's local browser timezone via `new Date(locksAt)`, which will show the correct local equivalent.

**Tradeoffs:** CHALLENGE_LINK rooms stay in `status: "WRITING"` forever in the store (no state transition). `isLocked` is always recomputed at GET time. This means the room store's `status` field is meaningless for CHALLENGE_LINK — only `locksAt` matters. When PostgreSQL is connected, consider adding a computed `isLocked` column or always deriving it at query time.

---

## 2026-06-01 — CHALLENGE_LINK rooms start in WRITING, not LOBBY

**Decision:** When a user creates a Challenge Link (after solo play), the room is created with `status: "WRITING"`, not `"LOBBY"`. The creator's bars are immediately saved as a submission.

**Reason:** The creator has already written their bars. Sending them into a LOBBY where they'd have to click "Start Game" is confusing and adds friction. Starting in WRITING state communicates "I'm waiting for you to write" rather than "we're setting up a game."

**Tradeoffs:** The host cannot add more participants before starting — the game is open immediately. Friends who open the link join directly into the writing phase. The host (creator) lands on the "Bars submitted! Waiting for friends" state and can start voting once enough submissions are in. If the host closes their browser, nobody can start voting (same host-dependency limitation as group rooms — documented as known limitation for MVP).

**How to apply:** `POST /api/rooms` with `source: "CHALLENGE_LINK"` sets `status: "WRITING"`, calls `saveSubmission()` immediately, marks host `hasSubmitted: true`. Room page: when `status === "WRITING"` and `!hasJoined`, shows `WritingJoinView` (join form with challenger's name) instead of `WritingView`.

---

## 2026-06-02 — Rule check architecture: heuristic-first, AI-placeholder, non-fatal saving

**Decision:** The Phase 5 constraint engine is built in three tiers: (1) deterministic local checks (line count, required words, alliteration, end-rhyme heuristic, chain rhyme, theme reference) with confidence 1.0–0.85; (2) AI-placeholder checks (metaphor, punchline, callback, internal rhyme, assonance) that return NEEDS_REVIEW and confidence 0–0.65 until replaced with real AI calls; (3) highlight span saving is non-fatal — if the DB write fails, the submission still records successfully.

**Reason:**
- No API key required for the app to function — all current checks run locally in the submit handler
- Submission must never be blocked by a rule check bug (constraint-check code runs after the submission row is created; saving failures are caught and logged but not re-thrown)
- Creative quality is never scored — AI checks only detect structural pattern compliance (does this line end with a rhyming word?), never judge whether bars are good
- `NEEDS_REVIEW` status communicates uncertainty to future tooling without lying to the user

**Tradeoffs:** Heuristic rhyme detection is naive (vowel-nucleus matching). False positives and negatives are expected. This is intentional for MVP — the patterns are visible to users as colored highlights, not as gatekeeping. Real AI calls replace the placeholders in Phase 5B.

**How to apply:** When adding a new ConstraintType check: add it to `deterministic.ts` if it can be determined locally (confidence ≥ 0.8), or add it to `ai-placeholder.ts` as NEEDS_REVIEW if it requires semantic understanding. Wire it in `run-rule-checks.ts`. The saving loop in the submit route handles both ConstraintResult and HighlightSpan rows automatically.

---

## 2026-06-02 — Prisma XOR validation fix: explicit beatId: null required for snapshot rooms

**Decision:** When creating rooms that use `beatSnapshot`/`challengeSnapshot` (not FK relations), explicitly pass `beatId: null` and `challengeId: null` to `tx.room.create`.

**Reason:** Prisma 6 generates an `XOR<RoomCreateInput, RoomUncheckedCreateInput>` union type for models with optional relations. At runtime the Prisma engine must resolve which branch to use. Without explicit `beatId: null`, the engine cannot determine which path applies and falls back to requiring the `beat` relation object — producing "Argument `beat` is missing" even though the schema has `beat Beat?` (fully optional). Explicit nulls pin the call to `RoomUncheckedCreateInput` (raw FK path), which skips the relation-object requirement entirely.

**Tradeoffs:** None — schema was already correct, database already in sync. This is purely a Prisma runtime type-resolution hint, not a schema or data model change.

**How to apply:** Any `prisma.room.create()` or `tx.room.create()` that uses `beatSnapshot` instead of a `beat: { connect }` relation must include `beatId: null, challengeId: null` explicitly. Same pattern applies to any other optional relation fields that use a snapshot pattern.

---

## 2026-06-01 — Tailwind CSS only (no styled-components, no CSS modules)

**Decision:** Style everything with Tailwind CSS utility classes. Use shadcn/ui selectively for complex components (modals, selects) by copying component code.

**Reason:** Tailwind is mobile-first by default, has zero runtime overhead, and works extremely well with Claude Code. Copying shadcn/ui components avoids adding a library that could conflict with updates.

**Tradeoffs:** Long className strings in JSX. Acceptable for a team using Claude Code, which handles this well.
