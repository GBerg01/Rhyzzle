# Rhyzzle

**The daily rap puzzle.**

Rhyzzle is a mobile-first daily rap puzzle and group-chat writing game. Create a private room, share the link into iMessage, Discord, Snapchat, or any group chat — friends join with a nickname, listen to the same beat, write 4/6/8 bars, submit, and vote who cooked.

No app download. No account required. Open the link and write.

---

## Current Status

**Phase 0 — Foundation complete.**
Project scaffolded with Next.js, TypeScript, Tailwind, Prisma schema, sample data, documentation foundation, and placeholder pages for all core routes.

**Phase 1 — Private Rhyzzle Rooms** is next.

See [TASKS.md](TASKS.md) for the full task list and [PROGRESS.md](PROGRESS.md) for session-by-session history.

---

## How to Run Locally

### Prerequisites
- Node.js 20+
- PostgreSQL running locally (or a Postgres connection string)
- pnpm (recommended) or npm

### Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Copy env file and fill in your DATABASE_URL
cp .env.example .env.local

# 3. Push schema to database
pnpm db:push

# 4. Generate Prisma client
pnpm db:generate

# 5. Seed sample data
pnpm db:seed

# 6. Run dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) on your phone or in a mobile-sized browser window.

---

## Main Commands

| Command | Description |
|---|---|
| `pnpm dev` | Start development server |
| `pnpm build` | Production build |
| `pnpm lint` | Run ESLint |
| `pnpm db:push` | Push Prisma schema to database |
| `pnpm db:generate` | Regenerate Prisma client |
| `pnpm db:seed` | Seed sample beats, challenges, and a test room |
| `pnpm db:studio` | Open Prisma Studio (visual DB browser) |
| `pnpm db:migrate` | Run Prisma migrations (production) |

---

## Project Structure

```
rhyzzle/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Root layout
│   ├── globals.css             # Tailwind base styles
│   ├── page.tsx                # Landing page (/)
│   ├── create/
│   │   └── page.tsx            # Create room form
│   ├── room/
│   │   └── [roomCode]/
│   │       └── page.tsx        # Room experience (join → write → vote → reveal)
│   ├── daily/
│   │   └── page.tsx            # Daily challenge (placeholder)
│   ├── discover/
│   │   └── page.tsx            # Discover feed (placeholder)
│   ├── profile/
│   │   └── page.tsx            # Profile page (placeholder)
│   └── api/
│       └── rooms/
│           ├── route.ts        # POST /api/rooms — create room
│           └── [roomCode]/
│               ├── route.ts    # GET /api/rooms/[roomCode]
│               ├── join/route.ts
│               ├── submit/route.ts
│               └── vote/route.ts
├── components/
│   ├── beat-player.tsx         # Audio beat player component
│   ├── bar-editor.tsx          # Line-by-line bar writing editor
│   └── challenge-card.tsx      # Challenge rules display
├── lib/
│   ├── types.ts                # Shared TypeScript types
│   ├── utils.ts                # Utility functions (room codes, scoring, etc.)
│   └── sample-data.ts          # Seed beats, challenges, rooms
├── prisma/
│   ├── schema.prisma           # Full data model
│   └── seed.ts                 # Database seeder
├── AGENTS.md                   # Instructions for future Claude Code sessions
├── ARCHITECTURE.md             # Technical architecture overview
├── DECISIONS.md                # Product and technical decision log
├── PRODUCT_BRIEF.md            # Product vision and scope
├── PROGRESS.md                 # Session-by-session progress log
├── ROADMAP.md                  # Phase-by-phase roadmap
└── TASKS.md                    # Actionable task list with status
```

---

## Key Docs

- [PRODUCT_BRIEF.md](PRODUCT_BRIEF.md) — What Rhyzzle is and why
- [ARCHITECTURE.md](ARCHITECTURE.md) — How it's built
- [ROADMAP.md](ROADMAP.md) — What's coming and when
- [TASKS.md](TASKS.md) — Current work queue
- [AGENTS.md](AGENTS.md) — Instructions for Claude Code sessions
