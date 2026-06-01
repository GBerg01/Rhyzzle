// Static sample data for development and seeding.
// Used by prisma/seed.ts and for UI previews in dev mode.

import type { SampleBeat, SampleChallenge } from "./types";

// ─── Sample Beats ──────────────────────────────────────────────────────────
// Audio URLs point to placeholder files in /public/beats/
// Replace with real audio files for production.

export const SAMPLE_BEATS: SampleBeat[] = [
  {
    id: "beat_1",
    title: "Midnight Grind",
    artist: "Rhyzzle House",
    audioUrl: "/beats/midnight-grind.mp3",
    bpm: 90,
    genre: "Boom Bap",
    durationSec: 180,
    coverUrl: "/beats/covers/midnight-grind.jpg",
    tags: ["boom-bap", "dark", "classic", "hard"],
  },
  {
    id: "beat_2",
    title: "City Lights",
    artist: "Rhyzzle House",
    audioUrl: "/beats/city-lights.mp3",
    bpm: 85,
    genre: "Lo-Fi Hip Hop",
    durationSec: 200,
    coverUrl: "/beats/covers/city-lights.jpg",
    tags: ["lo-fi", "chill", "melodic", "night"],
  },
  {
    id: "beat_3",
    title: "Trap House",
    artist: "Rhyzzle House",
    audioUrl: "/beats/trap-house.mp3",
    bpm: 140,
    genre: "Trap",
    durationSec: 160,
    coverUrl: "/beats/covers/trap-house.jpg",
    tags: ["trap", "hard", "808s", "energetic"],
  },
  {
    id: "beat_4",
    title: "Summer Flex",
    artist: "Rhyzzle House",
    audioUrl: "/beats/summer-flex.mp3",
    bpm: 95,
    genre: "West Coast",
    durationSec: 190,
    coverUrl: "/beats/covers/summer-flex.jpg",
    tags: ["west-coast", "smooth", "vibes", "sunny"],
  },
  {
    id: "beat_5",
    title: "Brooklyn Bounce",
    artist: "Rhyzzle House",
    audioUrl: "/beats/brooklyn-bounce.mp3",
    bpm: 92,
    genre: "East Coast",
    durationSec: 175,
    coverUrl: "/beats/covers/brooklyn-bounce.jpg",
    tags: ["east-coast", "bounce", "classic", "grimy"],
  },
];

// ─── Sample Challenge Templates ────────────────────────────────────────────

export const SAMPLE_CHALLENGES: SampleChallenge[] = [
  // ── 4-Bar Challenges ──────────────────────────────────────────────────────
  {
    id: "challenge_4bar_1",
    title: "Classic AABB",
    description: "Write 4 bars following an AABB rhyme scheme. Lines 1&2 rhyme, Lines 3&4 rhyme.",
    barCount: 4,
    rules: [
      {
        type: "RHYME_SCHEME",
        rhymeScheme: "AABB",
        description: "Lines 1 & 2 must rhyme (AA). Lines 3 & 4 must rhyme (BB).",
      },
      {
        type: "PUNCHLINE",
        lineIndex: 3,
        description: "Line 4 must land as a punchline.",
      },
    ],
  },
  {
    id: "challenge_4bar_2",
    title: "Chain Reaction",
    description: "Each line must start with a word that rhymes with the last word of the previous line.",
    barCount: 4,
    rules: [
      {
        type: "LINE_START_RHYMES_WITH_PREVIOUS_END",
        description: "Each line must start with a word that rhymes with the end of the previous line.",
      },
      {
        type: "ALLITERATION",
        lineIndex: 0,
        description: "Line 1 must include alliteration.",
      },
    ],
  },
  {
    id: "challenge_4bar_3",
    title: "Crown & City",
    description: "Write 4 bars. You must use the required words somewhere in your submission.",
    barCount: 4,
    rules: [
      {
        type: "REQUIRED_WORD",
        description: "Must use the words: crown, grind, city.",
      },
      {
        type: "RHYME_SCHEME",
        rhymeScheme: "ABAB",
        description: "Lines 1 & 3 rhyme. Lines 2 & 4 rhyme.",
      },
    ],
    requiredWords: ["crown", "grind", "city"],
  },

  // ── 6-Bar Challenges ──────────────────────────────────────────────────────
  {
    id: "challenge_6bar_1",
    title: "Build the Bridge",
    description: "6 bars. Lines 2 and 4 must rhyme. Line 5 must be a metaphor. Line 6 must be a punchline.",
    barCount: 6,
    rules: [
      {
        type: "END_RHYME",
        lineIndex: 1,
        targetLine: 3,
        description: "Lines 2 and 4 must end-rhyme with each other.",
      },
      {
        type: "METAPHOR",
        lineIndex: 4,
        description: "Line 5 must be a metaphor.",
      },
      {
        type: "PUNCHLINE",
        lineIndex: 5,
        description: "Line 6 must land as a punchline.",
      },
    ],
  },
  {
    id: "challenge_6bar_2",
    title: "Internal Affairs",
    description: "6 bars. Lines 2, 4, and 6 must each include an internal rhyme.",
    barCount: 6,
    rules: [
      {
        type: "INTERNAL_RHYME",
        lineIndex: 1,
        description: "Line 2 must include an internal rhyme.",
      },
      {
        type: "INTERNAL_RHYME",
        lineIndex: 3,
        description: "Line 4 must include an internal rhyme.",
      },
      {
        type: "INTERNAL_RHYME",
        lineIndex: 5,
        description: "Line 6 must include an internal rhyme.",
      },
    ],
  },
  {
    id: "challenge_6bar_3",
    title: "Hunger Theme",
    description: "6 bars on the theme of hunger. Must reference the theme explicitly.",
    barCount: 6,
    rules: [
      {
        type: "THEME_REFERENCE",
        theme: "hunger",
        description: "Must reference the theme of hunger — ambition, food, survival, or all three.",
      },
      {
        type: "RHYME_SCHEME",
        rhymeScheme: "AABBCC",
        description: "Follow AABBCC rhyme scheme.",
      },
    ],
  },

  // ── 8-Bar Challenges ──────────────────────────────────────────────────────
  {
    id: "challenge_8bar_1",
    title: "Full Circle",
    description: "8 bars. Line 1 sets the scene. Line 8 must callback to Line 1.",
    barCount: 8,
    rules: [
      {
        type: "CALLBACK",
        lineIndex: 7,
        targetLine: 0,
        description: "Line 8 must callback to Line 1.",
      },
      {
        type: "METAPHOR",
        lineIndex: 2,
        description: "Line 3 must be a metaphor.",
      },
      {
        type: "PUNCHLINE",
        lineIndex: 3,
        description: "Line 4 must be a punchline.",
      },
      {
        type: "RHYME_SCHEME",
        rhymeScheme: "AABBCCDD",
        description: "Couplet rhyme scheme: AABBCCDD.",
      },
    ],
  },
  {
    id: "challenge_8bar_2",
    title: "The Gauntlet",
    description: "8 bars of maximum constraints. Every even line must end-rhyme. Lines 1, 3, 5, 7 must have internal rhymes.",
    barCount: 8,
    rules: [
      {
        type: "RHYME_SCHEME",
        rhymeScheme: "XAXAXAXA",
        description: "All even lines (2, 4, 6, 8) must rhyme with each other.",
      },
      {
        type: "INTERNAL_RHYME",
        lineIndex: 0,
        description: "Line 1 must include an internal rhyme.",
      },
      {
        type: "INTERNAL_RHYME",
        lineIndex: 2,
        description: "Line 3 must include an internal rhyme.",
      },
      {
        type: "INTERNAL_RHYME",
        lineIndex: 4,
        description: "Line 5 must include an internal rhyme.",
      },
      {
        type: "INTERNAL_RHYME",
        lineIndex: 6,
        description: "Line 7 must include an internal rhyme.",
      },
    ],
  },
  {
    id: "challenge_8bar_3",
    title: "Story Mode",
    description: "Tell a complete story in 8 bars. Must include a required word set. Must end with a punchline.",
    barCount: 8,
    rules: [
      {
        type: "REQUIRED_WORD",
        description: "Must use the words: broke, crown, legacy.",
      },
      {
        type: "PUNCHLINE",
        lineIndex: 7,
        description: "Line 8 must land as a punchline.",
      },
      {
        type: "CALLBACK",
        lineIndex: 7,
        targetLine: 0,
        description: "Line 8 must callback to Line 1.",
      },
    ],
    requiredWords: ["broke", "crown", "legacy"],
  },
];

// ─── Sample Room ────────────────────────────────────────────────────────────

export const SAMPLE_ROOM = {
  id: "room_test_1",
  roomCode: "TEST1",
  name: "Test Room",
  beatId: "beat_1",
  challengeId: "challenge_4bar_1",
  status: "LOBBY" as const,
  privacy: "PRIVATE" as const,
  votingMode: "ANONYMOUS" as const,
};
