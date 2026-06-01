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

## 2026-06-01 — Tailwind CSS only (no styled-components, no CSS modules)

**Decision:** Style everything with Tailwind CSS utility classes. Use shadcn/ui selectively for complex components (modals, selects) by copying component code.

**Reason:** Tailwind is mobile-first by default, has zero runtime overhead, and works extremely well with Claude Code. Copying shadcn/ui components avoids adding a library that could conflict with updates.

**Tradeoffs:** Long className strings in JSX. Acceptable for a team using Claude Code, which handles this well.
