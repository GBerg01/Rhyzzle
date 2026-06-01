# Rhyzzle — Agent Instructions

**READ THIS FIRST.** Every Claude Code session working on Rhyzzle must read this file before writing any code.

---

## Start of Every Session: Required Reading

Before touching any code, read these files in this order:

1. `PRODUCT_BRIEF.md` — What Rhyzzle is and what it is not
2. `ARCHITECTURE.md` — How the system is built and why
3. `TASKS.md` — What is done, in progress, and next
4. `PROGRESS.md` — What has been completed session by session
5. `DECISIONS.md` — Key decisions already made (don't reverse these without good reason)

Then inspect the current repo state:
- `git log --oneline -10` — recent commits
- `git status` — any uncommitted changes
- Read any files mentioned as IN_PROGRESS in TASKS.md

Only after this context is loaded should you begin coding.

---

## End of Every Session: Required Updates

Before finishing any session, update these files:

1. **TASKS.md** — Change status labels. Mark completed tasks as `DONE`. Mark started tasks as `IN_PROGRESS`.
2. **PROGRESS.md** — Add a new session entry at the bottom. Include: date, goal, what was done (file-by-file), current status, and next 5 tasks.
3. **DECISIONS.md** — If any significant architectural or product decision was made, document it here.

Do not skip these updates. They are the memory of the project.

---

## Never Do These Things

- **Never restart from scratch** unless the founder explicitly says "start over."
- **Never overwrite existing files without reading them first.**
- **Never break the mobile-first requirement.** Test UI at 375px width.
- **Never add AI scoring of creative quality.** Humans vote. AI assists with detection only.
- **Never add an account wall before writing.** Guest nicknames are the MVP auth.
- **Never add native mobile code** (React Native, Expo, Swift, Kotlin).
- **Never add vocal recording.**
- **Never add payments or monetization.**
- **Never add producer beat uploads** (use seeded beats for now).
- **Never add complex ML recommendation algorithms** (use the engagement score formula).
- **Never install unnecessary dependencies.** Every new package must have a clear reason.
- **Never reverse a decision in DECISIONS.md** without documenting the new decision and its reason.

---

## Always Do These Things

- **Keep MVP scope tight.** When in doubt, do less. Document what was left out.
- **Keep UI mobile-first.** 375px is the primary design target. Desktop is nice-to-have.
- **Keep the no-account flow working.** Guest users must always be able to play.
- **Keep the fast path fast.** The flow from link → writing → submitting must stay frictionless.
- **Make sensible decisions.** Don't ask vague questions. Pick the obvious MVP choice and document it.
- **Write simple code.** No premature abstractions. No over-engineering.
- **Use TypeScript strictly.** No `any` types without justification.
- **Handle errors gracefully.** API routes should return clear error messages.
- **Commit frequently with descriptive messages.**

---

## Tech Stack Cheat Sheet

| Thing | Answer |
|---|---|
| Framework | Next.js 15, App Router |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS |
| Components | shadcn/ui (copied in, selective) |
| ORM | Prisma |
| Database | PostgreSQL |
| Auth (MVP) | Guest session cookie + GuestUser model |
| Auth (future) | NextAuth.js or Clerk (Phase 6) |
| Package manager | pnpm |
| Deployment | Vercel (planned) |

---

## Key File Locations

| File | Purpose |
|---|---|
| `prisma/schema.prisma` | Authoritative data model |
| `lib/types.ts` | Shared TypeScript types |
| `lib/utils.ts` | Room code generation, score calculation |
| `lib/sample-data.ts` | Static seed data |
| `prisma/seed.ts` | Database seeder |
| `app/room/[roomCode]/page.tsx` | Core room experience |
| `app/create/page.tsx` | Room creation form |
| `components/beat-player.tsx` | Audio player |
| `components/bar-editor.tsx` | Line-by-line writing editor |
| `components/challenge-card.tsx` | Challenge rules display |

---

## Room State Machine

The room page has 5 states. All UI logic branches on this:

```
LOBBY → WRITING → VOTING → REVEAL → CLOSED
```

The `RoomStatus` enum in `prisma/schema.prisma` and `lib/types.ts` defines these values. The room page renders a different UI for each state. The API returns state-appropriate data (no submission content in WRITING, anonymous submissions in VOTING).

---

## Engagement Score Formula

For public submissions in Discover and Daily:

```typescript
const engagementScore =
  (likes_count * 1) +
  (comments_count * 2) +
  (votes_count * 3) +
  (shares_count * 4) +
  (saves_count * 3)

const hoursSinceCreated = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60)
const hotScore = engagementScore / Math.pow(hoursSinceCreated + 2, 1.3)
```

This is defined in `lib/utils.ts`. Do not change this formula without updating DECISIONS.md.

---

## Highlight Color Reference (Phase 5)

| Color | Category | CSS |
|---|---|---|
| Blue | END_RHYME | `bg-blue-500/20 text-blue-300` |
| Purple | INTERNAL_RHYME | `bg-purple-500/20 text-purple-300` |
| Pink | ALLITERATION | `bg-pink-500/20 text-pink-300` |
| Teal | ASSONANCE | `bg-teal-500/20 text-teal-300` |
| Green | METAPHOR | `bg-green-500/20 text-green-300` |
| Yellow | PUNCHLINE | `bg-yellow-500/20 text-yellow-300` |
| Orange | DOUBLE_MEANING | `bg-orange-500/20 text-orange-300` |
| Brown | CALLBACK | `bg-amber-800/20 text-amber-500` |
| Gold outline | REQUIRED_WORD | `ring-1 ring-amber-400` |
| Red underline | FAILED_REQUIREMENT | `underline decoration-red-500` |

---

## Questions? Unclear Task?

If the task description in TASKS.md is unclear, check ARCHITECTURE.md and PRODUCT_BRIEF.md first. If still unclear, make the simplest MVP decision that keeps the product moving and document it in DECISIONS.md. Do not block on vague questions — default to the most obvious, least complex interpretation.
