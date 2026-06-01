# Rhyzzle — Task List

Status labels: `TODO` | `IN_PROGRESS` | `DONE` | `BLOCKED`

---

## Phase 0: Foundation

| Status | Task | Files |
|---|---|---|
| `DONE` | Initialize Next.js 15 + TypeScript + Tailwind | `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts` |
| `DONE` | Create documentation foundation | `README.md`, `PRODUCT_BRIEF.md`, `ARCHITECTURE.md`, `ROADMAP.md`, `TASKS.md`, `PROGRESS.md`, `DECISIONS.md`, `AGENTS.md` |
| `DONE` | Create Prisma schema | `prisma/schema.prisma` |
| `DONE` | Create sample/seed data | `lib/sample-data.ts`, `prisma/seed.ts` |
| `DONE` | Scaffold all core pages (placeholder) | `app/page.tsx`, `app/create/page.tsx`, `app/room/[roomCode]/page.tsx`, `app/daily/page.tsx`, `app/discover/page.tsx`, `app/profile/page.tsx` |
| `DONE` | Scaffold API route stubs | `app/api/rooms/route.ts`, `app/api/rooms/[roomCode]/route.ts`, `app/api/rooms/[roomCode]/join/route.ts`, `app/api/rooms/[roomCode]/submit/route.ts`, `app/api/rooms/[roomCode]/vote/route.ts` |
| `DONE` | Create shared TypeScript types | `lib/types.ts` |
| `DONE` | Create utility functions | `lib/utils.ts` |
| `DONE` | Create BeatPlayer component | `components/beat-player.tsx` |
| `DONE` | Create BarEditor component | `components/bar-editor.tsx` |
| `DONE` | Create ChallengeCard component | `components/challenge-card.tsx` |
| `DONE` | Create .env.example | `.env.example` |
| `DONE` | Create .gitignore | `.gitignore` |

---

## Phase 1: Private Rooms — Create & Join

| Status | Task | Acceptance Criteria | Files |
|---|---|---|---|
| `TODO` | Connect PostgreSQL database locally | `pnpm db:push` succeeds without errors | `.env.local`, `prisma/schema.prisma` |
| `TODO` | Run `pnpm db:seed` and verify data loads | 5 beats and 10 challenges visible in Prisma Studio | `prisma/seed.ts` |
| `DONE` | Implement `POST /api/rooms` — create room | Returns `{ roomCode, roomId }`, room persisted in store | `app/api/rooms/route.ts`, `lib/room-store.ts` |
| `DONE` | Make `/create` form functional | Submitting form redirects to `/room/[roomCode]` | `app/create/page.tsx` |
| `DONE` | Fetch beats from DB for create form | Beat selector shows beats from sample-data (real DB TODO) | `app/create/page.tsx` |
| `DONE` | Implement room code generation | 5-char alphanumeric, unique, readable | `lib/utils.ts` |
| `DONE` | Implement `POST /api/rooms/[roomCode]/join` | Adds participant to room store, sets session cookie | `app/api/rooms/[roomCode]/join/route.ts` |
| `DONE` | Implement `GET /api/rooms/[roomCode]` | Returns room state from in-memory store | `app/api/rooms/[roomCode]/route.ts` |
| `DONE` | Implement room page LOBBY state (functional) | Shows join form, participant list updates on poll | `app/room/[roomCode]/page.tsx` |
| `DONE` | Implement client-side polling (4s interval) | Room page refreshes state without full page reload | `app/room/[roomCode]/page.tsx` |
| `TODO` | Make BeatPlayer functional | Audio plays/pauses from a URL | `components/beat-player.tsx` |
| `DONE` | Mobile UI polish — LOBBY state | Host lands in lobby directly; invite link visible; guest join form works | `app/room/[roomCode]/page.tsx` |

---

## Phase 2: Writing, Voting & Reveal

| Status | Task | Acceptance Criteria | Files |
|---|---|---|---|
| `DONE` | Implement WRITING state in room page | Puzzle board canvas with scheme tags, rule chips, row tints, per-line inputs; beat card; sticky submit | `app/room/[roomCode]/page.tsx`, `components/lyric-puzzle-canvas.tsx` |
| `DONE` | Implement `POST /api/rooms/[roomCode]/submit` | Submission + lines saved to store, room shows X/N submitted | `app/api/rooms/[roomCode]/submit/route.ts` |
| `DONE` | Show submission progress indicator | "2 of 4 submitted" updates in real time via polling | `app/room/[roomCode]/page.tsx` |
| `DONE` | Host can advance room to WRITING state | `POST /api/rooms/[roomCode]/start` — host-only, LOBBY→WRITING | `app/room/[roomCode]/page.tsx`, `app/api/rooms/[roomCode]/start/route.ts` |
| `DONE` | Host can advance room to VOTING state | `POST /api/rooms/[roomCode]/start-voting` — host-only, WRITING→VOTING, needs ≥2 submissions | `app/room/[roomCode]/page.tsx`, `app/api/rooms/[roomCode]/start-voting/route.ts` |
| `DONE` | Implement VOTING state | Anonymous submission cards, vote button, own submission locked, host reveal button | `app/room/[roomCode]/page.tsx` |
| `DONE` | Implement `POST /api/rooms/[roomCode]/vote` | Vote stored in memory, prevents double-vote and self-vote | `app/api/rooms/[roomCode]/vote/route.ts` |
| `DONE` | Host can advance room to REVEAL state | `POST /api/rooms/[roomCode]/reveal` — host-only, VOTING→REVEAL, needs ≥1 vote | `app/room/[roomCode]/page.tsx`, `app/api/rooms/[roomCode]/reveal/route.ts` |
| `DONE` | Implement REVEAL state | Winner highlighted, tied winners handled, all submissions de-anonymized | `app/room/[roomCode]/page.tsx` |
| `DONE` | Basic result share card | Share Results button, Create New Room CTA | `app/room/[roomCode]/page.tsx` |
| `TODO` | End-to-end integration test | Full flow: create → join (3 users) → write → vote → reveal | All |

---

## Phase 3: Rhyzzle Daily

| Status | Task | Acceptance Criteria | Files |
|---|---|---|---|
| `TODO` | Seed today's DailyChallenge record | DailyChallenge row exists for today's date | `prisma/seed.ts` |
| `TODO` | `/daily` page shows today's challenge | Beat player and challenge card visible | `app/daily/page.tsx` |
| `TODO` | Daily submissions functional | Any visitor can submit, stored as public submission | `app/api/daily/route.ts` |
| `TODO` | Daily feed (today's submissions) | Submissions listed below challenge | `app/daily/page.tsx` |
| `TODO` | Likes on daily submissions | One like per guest session | New API routes |
| `TODO` | Comments on daily submissions | Guest can leave a comment | New API routes |

---

## Phase 4: Discover Feed

| Status | Task | Acceptance Criteria | Files |
|---|---|---|---|
| `TODO` | `/discover` page — Hot Today tab | Shows top submissions by hot_score | `app/discover/page.tsx` |
| `TODO` | Engagement score + hot score calculation | Computed correctly, updates on like/vote/share | `lib/utils.ts` |
| `TODO` | Top This Week tab | Filtered by created_at >= 7 days ago, sorted by engagement | `app/discover/page.tsx` |
| `TODO` | New tab | Sorted by created_at desc | `app/discover/page.tsx` |
| `TODO` | Save submission action | Saves record created, saves_count incremented | New API routes |
| `TODO` | Share submission action | Share event logged, shares_count incremented | New API routes |

---

## Phase 2.5: Rule Education (Writing UX)

| Status | Task | Acceptance Criteria | Files |
|---|---|---|---|
| `DONE` | Rule help definitions | Centralized map with 13 rule types, each with definition, example, tip | `lib/rule-help.ts` |
| `DONE` | Rule chip tap-to-help | Tapping any chip opens bottom sheet with definition, example, tip | `components/lyric-puzzle-canvas.tsx`, `components/rule-help-sheet.tsx` |
| `DONE` | Required word tap-to-help | Tapping a required word chip explains what it means | `components/lyric-puzzle-canvas.tsx` |

---

## Phase 5: Highlighting & Constraint Engine

| Status | Task | Acceptance Criteria | Files |
|---|---|---|---|
| `TODO` | Constraint evaluation service | Given a submission + challenge rules, returns ConstraintResult[] | `lib/constraint-engine.ts` |
| `TODO` | Trigger constraint check on submission | ConstraintResult rows saved after submit | `app/api/rooms/[roomCode]/submit/route.ts` |
| `TODO` | Highlight span detection (end rhyme) | HighlightSpan rows created for end rhyming words | `lib/highlight-engine.ts` |
| `TODO` | Highlight rendering in submission display | Blue highlights on end-rhyming words | `components/submission-display.tsx` |
| `TODO` | All highlight categories | All 10 color categories rendering | `components/submission-display.tsx` |
| `TODO` | Constraint failure indicators in editor | Red indicator on lines violating constraints | `components/bar-editor.tsx` |

---

## Phase 6: Accounts & Social

| Status | Task | Acceptance Criteria | Files |
|---|---|---|---|
| `TODO` | Authentication setup (NextAuth or Clerk) | Users can sign up, log in, log out | `app/api/auth/`, `lib/auth.ts` |
| `TODO` | Link GuestUser to new User account | All guest submissions transferred to real account | Migration, `app/api/auth/` |
| `TODO` | Profile page functional | Shows username, submission history, win count | `app/profile/page.tsx` |
| `TODO` | Public profile `/u/[username]` | Shareable page showing user's best submissions | `app/u/[username]/page.tsx` |

---

## Backlog (Unscheduled)

| Task | Notes |
|---|---|
| Real-time room sync (SSE or WebSockets) | Replace polling when real-time feel matters |
| Beat upload by producers | S3/R2, Beat model already supports this |
| Result card as image | Use canvas or og-image generation |
| Admin dashboard | Create/schedule DailyChallenges, view stats |
| Challenge template library | Browse and reuse challenge templates |
| Required word validation UI | Show which required words are used/missing while typing |
