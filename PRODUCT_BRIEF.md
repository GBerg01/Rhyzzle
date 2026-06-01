# Rhyzzle — Product Brief

## Product Vision

Rhyzzle is the daily rap puzzle and group-chat writing game. It lives at the intersection of Wordle's daily ritual, Jackbox's party energy, and Genius's lyric obsession. No download. No account wall. Just a link, a beat, and your bars.

The product makes writing rap fun, social, and competitive for anyone — from actual rappers to people who have never written a bar in their life. The constraint-based challenges level the playing field and make even bad bars funny and shareable.

---

## Target User

**Primary:** People aged 16–35 who:
- Are already in active group chats (iMessage, Discord, Snapchat, Instagram DM)
- Like rap/hip-hop music
- Enjoy Wordle-style daily games, trivia, Jackbox, or creative party games
- Would not download a standalone app but will click a link

**Secondary:** Aspiring rappers who want low-stakes practice with feedback from friends.

---

## The Core Loop

```
Host creates room → selects beat + rules → shares link in group chat
→ Friends open link → join with nickname → listen to beat
→ Write 4/6/8 bars within constraints → submit
→ Anonymous voting round → winner revealed
→ Share the result card
```

The loop must be completable in under 10 minutes. Frictionless entry is non-negotiable.

---

## Game Modes

### 1. Rhyzzle Rooms (MVP Priority)
Private group-chat rooms. Host creates a custom game. Friends join via shared link. Group writes, votes, and reveals the winner together. Each room is a self-contained game session.

**Host controls:**
- Beat selection
- Bar count (4, 6, or 8 bars)
- Challenge rules (rhyme scheme, constraints, required words)
- Privacy (private by default)
- Voting mode (anonymous by default)
- Optional deadline

### 2. Rhyzzle Daily (Phase 3)
One official public challenge per day. Everyone worldwide gets the same beat, same bar count, same rules. Public submissions receive likes, comments, votes, shares, and saves. Builds the community and creates a shared conversation.

### 3. Discover (Phase 4)
Public feed of strong, funny, and popular entries from Rhyzzle Daily. Simple ranking based on engagement and recency. No ML in MVP. Tabs: Hot Today, Top This Week, New, Most Debated, Cooked.

---

## MVP Scope

**In scope for MVP (Phase 1–2):**
- Create a private room (beat + bar count + challenge rules)
- Generate a shareable room link/code
- Join room with a nickname (no account required)
- Beat player (static/seeded audio files)
- Line-by-line bar editor (4/6/8 lines)
- Challenge card displaying rules
- Submit bars
- Anonymous voting (vote for best overall)
- Winner reveal
- Result card (shareable image/text — basic version)

**Not in MVP:**
- User accounts / profiles (guest-first)
- Rhyzzle Daily (Phase 3)
- Discover feed (Phase 4)
- AI rhyme/constraint highlighting (Phase 5)
- Real-time sync (polling is fine for MVP)
- Producer uploads (use seeded beats)
- Vocal recording
- Payments / monetization
- Native mobile app
- Complex recommendation algorithms
- Group/crew persistence
- Follow/social graph

---

## Product Principles

1. **Mobile-first.** Every screen must work perfectly at 375px wide. Test on phone first.
2. **No download required.** Web app only for MVP. No React Native, no Expo.
3. **No account wall.** Guest nicknames are sufficient to play. Account creation comes later.
4. **Speed to first bar.** The fastest possible flow from link → writing → submitting.
5. **Humans vote on quality.** AI does not score creative merit. Humans decide who cooked.
6. **AI assists, not judges.** AI may highlight rhyme schemes and patterns, but never ranks submissions.
7. **Constraints create fun.** The rules and limitations are the game. They level the playing field.
8. **Private rooms first.** The group-chat share mechanic is the core growth loop.
9. **Simple discovery.** No ML. Engagement counts + recency = ranking. Transparent and honest.
10. **Build to continue.** Every session should document decisions, update tasks, and leave the project better than it was found.

---

## Challenge / Rule System

Rules can include any combination of:

| Rule Type | Example |
|---|---|
| End rhyme | Lines 2 and 4 must rhyme |
| Internal rhyme | Line 2 must include an internal rhyme |
| Chain rhyme | Line N must start with a word that rhymes with the end of Line N-1 |
| Metaphor | Line 3 must be a metaphor |
| Punchline | Line 4 must be a punchline |
| Callback | Line 8 must callback to Line 1 |
| Alliteration | Line 1 must include alliteration |
| Required words | Must include "crown," "grind," and "city" |
| Rhyme scheme | Follow AABB or ABAB pattern |
| Theme reference | Must reference the theme: "hunger" |

---

## Color / Highlight System (Future — Phase 5)

Submitted bars will eventually be color-coded:

| Color | Meaning |
|---|---|
| Blue | End rhyme |
| Purple | Internal rhyme |
| Pink | Alliteration |
| Teal | Assonance |
| Green | Metaphor |
| Yellow | Punchline |
| Orange | Double meaning |
| Brown | Callback |
| Gold outline | Required word (found) |
| Red underline | Failed / missing requirement |

The database schema is already designed to store `HighlightSpan` and `ConstraintResult` records. The UI layer for rendering them is Phase 5.

---

## Engagement and Discovery Scoring

For public submissions (Rhyzzle Daily + Discover):

```
engagement_score =
  (likes_count * 1) +
  (comments_count * 2) +
  (votes_count * 3) +
  (shares_count * 4) +
  (saves_count * 3)

hot_score = engagement_score / pow(hours_since_created + 2, 1.3)
```

Both scores are stored pre-computed on the `Submission` model and recalculated on engagement events.

---

## Success Metrics (MVP)

- Room creation → share → first participant joins (conversion)
- All participants submit bars (completion rate)
- Voting round completes (engagement depth)
- Result card shared (virality signal)
- Average session length
- Return visits (same user creates or joins another room)
