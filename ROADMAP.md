# Rhyzzle — Roadmap

## Phase 0: Repository & Project Foundation ✅
**Goal:** Create a durable, well-documented project foundation that every future session can build on.

- [x] Initialize Next.js 15 + TypeScript + Tailwind app
- [x] Create documentation foundation (README, PRODUCT_BRIEF, ARCHITECTURE, ROADMAP, TASKS, PROGRESS, DECISIONS, AGENTS)
- [x] Create Prisma schema (full data model including future-ready fields)
- [x] Create sample data (5 beats, 10 challenge templates, 1 test room)
- [x] Scaffold placeholder pages for all core routes
- [x] Scaffold API route stubs
- [x] Create reusable components (BeatPlayer, BarEditor, ChallengeCard)
- [x] Create shared TypeScript types

---

## Phase 1: Private Rhyzzle Room — Create & Join
**Goal:** A host can create a room and share a link. Friends can open the link and join with a nickname.

- [ ] Database connected and migrations running
- [ ] `POST /api/rooms` — create a room, persist to DB, return roomCode
- [ ] `/create` page — functional form (beat select, bar count, rules, privacy)
- [ ] Room code generation (short, readable 5-char codes)
- [ ] `/room/[roomCode]` — LOBBY state (nickname input, join button, wait for others)
- [ ] `POST /api/rooms/[roomCode]/join` — create GuestUser + RoomParticipant
- [ ] Session token in cookie (ties guest to their room session)
- [ ] `GET /api/rooms/[roomCode]` — returns room state, participants list
- [ ] Room page polling every 4s for state changes
- [ ] Beat player component functional (plays audio from URL)
- [ ] Mobile-first UI polish for LOBBY state

**Acceptance criteria:**
- Host creates a room on `/create`, gets a URL like `/room/XK9F2`
- Three friends open that URL on their phones, enter nicknames, and appear in the participant list
- Host sees all participants in the lobby

---

## Phase 2: Writing, Voting & Winner Reveal
**Goal:** Participants write bars, vote anonymously, and see the winner revealed.

- [ ] Room advances from LOBBY → WRITING (host triggers or auto-start)
- [ ] WRITING state: beat player + challenge card + bar editor displayed
- [ ] `POST /api/rooms/[roomCode]/submit` — save submission lines to DB
- [ ] WRITING state: show "X of N submitted" progress indicator
- [ ] Host can advance to voting when all submitted (or force-advance)
- [ ] Room advances WRITING → VOTING
- [ ] VOTING state: show anonymous submissions, one vote per participant
- [ ] `POST /api/rooms/[roomCode]/vote` — record vote, prevent double-voting
- [ ] Room advances VOTING → REVEAL when all voted (or host force-advances)
- [ ] REVEAL state: winner highlighted, all submissions de-anonymized
- [ ] Basic result card (share as text/image)
- [ ] Full end-to-end test: create → join → write → vote → reveal

**Acceptance criteria:**
- 3 participants submit bars, see each other's anonymous submissions, vote, and see the winner revealed with names shown

---

## Phase 3: Rhyzzle Daily
**Goal:** One official daily challenge that everyone in the world can participate in.

- [ ] DailyChallenge model seeded and functional
- [ ] `/daily` page shows today's beat + challenge
- [ ] Daily submissions are public (linked to guestUser or user)
- [ ] Likes on daily submissions
- [ ] Comments on daily submissions
- [ ] Daily leaderboard (most voted / most liked)
- [ ] Admin interface or seed script for creating daily challenges

**Acceptance criteria:**
- Any visitor can open `/daily`, see today's challenge, write bars, and submit
- Submissions from different visitors appear in the daily feed

---

## Phase 4: Discover Feed
**Goal:** A public feed of the best submissions from Rhyzzle Daily.

- [ ] `/discover` page with "Hot Today" tab
- [ ] Engagement score + hot score computed on submission (likes, votes, shares, saves)
- [ ] Tab: Top This Week
- [ ] Tab: New
- [ ] Tab: Most Debated
- [ ] Save / share submission actions
- [ ] Pre-computed score updates on engagement events

**Acceptance criteria:**
- Submissions from Daily appear on Discover with correct ranking
- Hot/Top/New tabs return different orderings

---

## Phase 5: Lyric Highlighting & Constraint Engine
**Goal:** Submitted bars are analyzed and color-coded for rhyme schemes, metaphors, punchlines, required words, and constraint failures.

- [ ] Constraint engine: evaluate ChallengeRules against submissions, write ConstraintResult
- [ ] API route for triggering constraint analysis on submission
- [ ] HighlightSpan population (AI-assisted: end rhyme, internal rhyme, alliteration detection)
- [ ] Highlight rendering in submission display UI
- [ ] Color coding: blue=end rhyme, purple=internal rhyme, pink=alliteration, teal=assonance, green=metaphor, yellow=punchline, orange=double meaning, brown=callback, gold=required word, red=failed requirement
- [ ] Constraint failure indicators in bar editor (while writing)
- [ ] Constraint pass/fail summary on reveal screen

**Acceptance criteria:**
- A submitted bar with end rhymes gets blue highlights on the rhyming words
- A submission missing a required word gets a red underline on the relevant line

---

## Phase 6: Accounts, Profiles & Social Features
**Goal:** Users can create real accounts, build a profile, follow each other, and track their stats.

- [ ] Authentication (NextAuth.js or Clerk)
- [ ] Account creation from existing GuestUser session (link history)
- [ ] Profile page: display name, avatar, submission history, win count, total votes received
- [ ] Follow / following graph
- [ ] Notifications (room status changes, new comments, vote results)
- [ ] Shareable profile page `/u/[username]`
- [ ] Creator beats library (if producer upload is pursued)

---

## Post-MVP / Exploratory

These are ideas captured for future consideration. No commitment yet.

- Beat marketplace (producers upload, earn royalties on usage)
- Vocal recording mode (requires native wrapper or WebRTC)
- Tournaments and bracket-style battles
- Clan/crew rooms with persistent identity
- Branded rooms for events (concerts, parties, marketing activations)
- Embed widget for third-party sites
- Payments / premium features
- Native iOS/Android app (after web product validated)
