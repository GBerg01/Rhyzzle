# Rhyzzle — Architecture

## Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Framework | Next.js 15 (App Router) | Full-stack, server components, API routes, easy deployment |
| Language | TypeScript | Type safety, better Claude Code collaboration |
| Styling | Tailwind CSS | Mobile-first utility classes, no runtime CSS overhead |
| UI Components | shadcn/ui (selective) | Copy-paste primitives, not a full library dependency |
| ORM | Prisma | Type-safe DB access, great DX, easy migrations |
| Database | PostgreSQL | Reliable relational DB, works locally and on Vercel/Supabase |
| Runtime | Node.js 20+ | Next.js default |
| Package Manager | pnpm | Faster installs, disk efficient |
| Deployment | Vercel (planned) | Zero-config Next.js deployment |

---

## Folder Structure

```
rhyzzle/
├── app/                        # Next.js App Router (all routes)
│   ├── layout.tsx              # Root HTML shell, global fonts, metadata
│   ├── globals.css             # Tailwind base + custom CSS vars
│   ├── page.tsx                # / — Landing page
│   ├── create/
│   │   └── page.tsx            # /create — Room creation form
│   ├── room/
│   │   └── [roomCode]/
│   │       └── page.tsx        # /room/[code] — Full room experience
│   ├── daily/
│   │   └── page.tsx            # /daily — Daily challenge
│   ├── discover/
│   │   └── page.tsx            # /discover — Public feed
│   ├── profile/
│   │   └── page.tsx            # /profile — User profile
│   └── api/
│       └── rooms/
│           ├── route.ts        # POST — create room
│           └── [roomCode]/
│               ├── route.ts    # GET — fetch room state
│               ├── join/
│               │   └── route.ts    # POST — join room with nickname
│               ├── submit/
│               │   └── route.ts    # POST — submit bars
│               └── vote/
│                   └── route.ts    # POST — cast vote
├── components/
│   ├── beat-player.tsx             # Audio player for the beat
│   ├── bar-editor.tsx              # Line-by-line writing editor
│   ├── challenge-card.tsx          # Displays challenge rules
│   ├── highlighted-text.tsx        # Inline span renderer (END_RHYME, REQUIRED_WORD, etc.)
│   ├── lyric-puzzle-canvas.tsx     # Full per-line puzzle board for WRITING state
│   ├── rule-help-sheet.tsx         # Bottom sheet with rule definitions
│   └── submission-pattern-card.tsx # Read-only card showing a submission with highlights
├── lib/
│   ├── types.ts                # Shared TypeScript types (DTOs, enums)
│   ├── utils.ts                # Helpers: room code gen, score calc, cn(), HIGHLIGHT_COLORS
│   ├── sample-data.ts          # Static seed data for dev/test
│   ├── daily-challenge.ts      # Today's challenge beat + variants (3/6/8 bars)
│   ├── lyric-meta.ts           # buildMeta(), deriveScheme() — shared between canvas + rule checks
│   ├── rule-help.ts            # Static rule education content (definitions, examples, tips)
│   └── rule-checks/
│       ├── types.ts            # RuleCheckStatus, RuleCheckResult, ComputedHighlightSpan
│       ├── deterministic.ts    # Local checks: line count, required words, rhyme, alliteration
│       ├── ai-placeholder.ts   # Heuristic stubs: metaphor, punchline, callback, assonance
│       └── run-rule-checks.ts  # Orchestrator: routes ConstraintType → appropriate checker
├── prisma/
│   ├── schema.prisma           # Full database schema
│   └── seed.ts                 # Seed script
└── public/
    └── beats/                  # Placeholder beat audio files (MVP)
```

---

## Data Model Overview

### Core Entities

**Beat** — An audio track. Has title, artist, BPM, audio URL, cover image. Seeded statically for MVP; producer uploads come later.

**Challenge** — A writing challenge template. Has bar count (4/6/8), a set of `ChallengeRule`s, and optional `RequiredWord`s. Reusable across rooms and daily challenges.

**ChallengeRule** — A single constraint on a submission. Has a `ConstraintType` enum, optional line index, and a human-readable description. Designed to support the constraint engine in Phase 5.

**Room** — A game session. Has a unique `roomCode` (5 chars), a beat, a challenge, a host, status (LOBBY/WRITING/VOTING/REVEAL/CLOSED), privacy, voting mode, and deadline.

**RoomParticipant** — A person in a room. Links to either a `User` (authenticated) or `GuestUser` (nickname-only). Has an `isHost` flag.

**Submission** — A participant's bars. Has `rawText`, parsed `SubmissionLine`s, vote count, and all engagement counts. Has `isAnonymous` flag for voting phase. Has pre-computed `engagementScore` and `hotScore` for discovery.

**SubmissionLine** — A single bar/line. Has `lineIndex` and `text`. Will hold `HighlightSpan`s in Phase 5.

**Vote** — A vote cast by a participant for a submission. One vote per participant per submission.

### Auth Entities

**User** — A real authenticated account (future). Has email, username, display name.

**GuestUser** — An anonymous session. Has `nickname` and `sessionId` (browser session token). Can be linked to a real `User` later when they sign up.

### Engagement Entities

**Like, Comment, Save, ShareEvent** — Engagement actions on public submissions. Feed into the discovery scoring formula.

### Phase 5 Entities (active as of Session 15)

**HighlightSpan** — A highlighted range within a `SubmissionLine`. Has `startIndex`, `endIndex`, `category` (END_RHYME, INTERNAL_RHYME, etc.), `color`, `confidence`, and explanation. Populated by `lib/rule-checks/` on every submit, returned in `SubmissionDTO.lines[].highlightSpans`, rendered by `HighlightedText` in `SubmissionPatternCard`.

**ConstraintResult** — Result of running a constraint check on a submission. Has `ruleType`, `lineIndex`, `passed`, `confidence`, and explanation. Populated non-fatally after submit. Future: drive red-underline failure indicators in the editor.

---

## Page / Route Overview

| Route | Purpose | State |
|---|---|---|
| `/` | Landing page, pitch, CTA | Static |
| `/create` | Room creation form | Client form → POST /api/rooms |
| `/room/[roomCode]` | Full room experience | Multi-state (LOBBY→WRITING→VOTING→REVEAL) |
| `/daily` | Daily challenge | Placeholder |
| `/discover` | Public feed | Placeholder |
| `/profile` | User profile | Placeholder |

---

## API / Server Action Overview

| Endpoint | Method | Description |
|---|---|---|
| `/api/rooms` | POST | Create a new room. Returns `roomCode`. |
| `/api/rooms/[roomCode]` | GET | Fetch room state + participants + submissions (phase-appropriate). |
| `/api/rooms/[roomCode]/join` | POST | Join a room with a nickname. Returns participant session token. |
| `/api/rooms/[roomCode]/submit` | POST | Submit bars (lines array). |
| `/api/rooms/[roomCode]/vote` | POST | Cast a vote for a submission. Prevents self-vote and double-vote. |
| `/api/rooms/[roomCode]/start-voting` | POST | Host-only. WRITING → VOTING. Requires ≥2 submissions. |
| `/api/rooms/[roomCode]/reveal` | POST | Host-only. VOTING → REVEAL. Requires ≥1 vote. |

All API routes return JSON. The room page polls `GET /api/rooms/[roomCode]` on an interval to sync state without requiring WebSockets in MVP.

---

## Room State Machine

```
LOBBY → WRITING → VOTING → REVEAL → CLOSED
```

- **LOBBY**: Waiting for participants to join. Host can start writing when ready.
- **WRITING**: All participants write their bars. Host can advance when all have submitted.
- **VOTING**: Submissions shown anonymously. Each participant votes for their favorite.
- **REVEAL**: Winner announced. Submissions de-anonymized. Result card available.
- **CLOSED**: Room archived, read-only.

Transitions triggered by: all participants submitting, host advancing, or deadline passing.

---

## Authentication Strategy

**MVP: Guest-first.** No account required.

On `/room/[roomCode]`, a guest provides a nickname. The server creates a `GuestUser` with a `sessionId` (random token stored in a cookie). All subsequent actions in that room are tied to that `sessionId`.

**Future:** Add NextAuth.js (or Clerk) for real accounts. `GuestUser` records can be linked to a `User` record retroactively.

The `RoomParticipant` model accepts either `userId` (real user) or `guestUserId` (guest). API routes check for both.

---

## Polling Strategy (MVP)

The room page polls `GET /api/rooms/[roomCode]` every 3–5 seconds. The response includes the current room status, participant count, and phase-appropriate data (no submission content during WRITING phase, anonymous content during VOTING phase).

**Future:** Replace polling with Server-Sent Events (SSE) or a lightweight WebSocket layer when real-time feel becomes important.

---

## Beat Storage (MVP)

Beats are seeded statically with placeholder audio file URLs pointing to `/public/beats/*.mp3`. No producer uploads in MVP. The `Beat` model is fully designed to support producer-uploaded beats later (artist, BPM, cover image, tags).

---

## Future Systems

| System | Phase | Notes |
|---|---|---|
| Real-time sync | After Phase 2 | Replace polling with SSE or WebSockets |
| User accounts | Phase 6 | NextAuth.js or Clerk |
| AI constraint engine | Phase 5 | Run ChallengeRule checks, populate ConstraintResult |
| AI highlighting | Phase 5 | Populate HighlightSpan with detected rhymes, metaphors, etc. |
| Producer beat uploads | Post-MVP | S3/R2 + Beat model extension |
| Vocal recording | Post-MVP | Not planned, would require native wrapper |
| Payments | Post-MVP | Stripe, if monetization is needed |
| Push notifications | Phase 6 | Web push for room status changes |
| Native mobile | Not planned | Web-first is the strategy |
