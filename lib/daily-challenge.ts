// Today's Rhyzzle daily challenge — the single shared beat + prompt for all players.
// For MVP this is static. Later it becomes date-driven from the database.
// This file is the single source of truth: home page, play page, create page,
// and room API all read from here so the copy never mismatches.

import type { ConstraintType } from "./types";

export type DailyBarCount = 3 | 6 | 8;

export interface DailyRuleData {
  type: ConstraintType;
  lineIndex?: number;
  targetLine?: number;
  rhymeScheme?: string;
  theme?: string;
  description: string;
}

export interface DailyChallengeVariant {
  id: string;
  title: string;
  description: string;
  barCount: DailyBarCount;
  rules: DailyRuleData[];
  requiredWords: string[];
}

// ─── Today's Beat ─────────────────────────────────────────────────────────────

export const DAILY_BEAT = {
  id: "beat_daily",
  title: "Midnight Bounce",
  artist: "Rhyzzle House",
  audioUrl: "/beats/brooklyn-bounce.mp3",
  bpm: 92,
  genre: "East Coast",
  durationSec: 175,
  coverUrl: "/beats/covers/brooklyn-bounce.jpg",
  tags: ["east-coast", "bounce", "classic"],
};

// ─── Today's Prompt ───────────────────────────────────────────────────────────

export const DAILY_TITLE = "Static Pressure";
export const DAILY_PROMPT = "Write about pressure turning into confidence.";
export const DAILY_REQUIRED_WORDS = ["static", "gold", "window"];

// ─── Bar-count variants ───────────────────────────────────────────────────────
// Each variant uses the same beat, theme, and required words.
// The pattern (rhyme scheme + per-line rules) expands with bar count.

const REQUIRED_RULE: DailyRuleData = {
  type: "REQUIRED_WORD",
  description: `Must use the words: ${DAILY_REQUIRED_WORDS.join(", ")}.`,
};

export const DAILY_VARIANTS: Record<DailyBarCount, DailyChallengeVariant> = {
  3: {
    id: "daily_3bar",
    title: `${DAILY_TITLE} — Quick`,
    description: "Set up a rhyme, pay it off, land the punchline. Three bars. Make them count.",
    barCount: 3,
    rules: [
      {
        type: "RHYME_SCHEME",
        rhymeScheme: "AAB",
        description: "Lines 1 & 2 rhyme (AA). Line 3 is the punchline (B).",
      },
      {
        type: "PUNCHLINE",
        lineIndex: 2,
        description: "Line 3 must land as a punchline.",
      },
      REQUIRED_RULE,
    ],
    requiredWords: DAILY_REQUIRED_WORDS,
  },

  6: {
    id: "daily_6bar",
    title: `${DAILY_TITLE} — Standard`,
    description: "Set up rhymes, drop a metaphor, hit the punchline, close with a callback.",
    barCount: 6,
    rules: [
      {
        type: "RHYME_SCHEME",
        rhymeScheme: "AABBCC",
        description: "Couplet rhyme scheme: AABBCC.",
      },
      {
        type: "METAPHOR",
        lineIndex: 2,
        description: "Line 3 must be a metaphor.",
      },
      {
        type: "PUNCHLINE",
        lineIndex: 3,
        description: "Line 4 must land as a punchline.",
      },
      {
        type: "INTERNAL_RHYME",
        lineIndex: 4,
        description: "Line 5 must include an internal rhyme.",
      },
      {
        type: "CALLBACK",
        lineIndex: 5,
        description: "Line 6 must callback to an earlier idea in the verse.",
      },
      REQUIRED_RULE,
    ],
    requiredWords: DAILY_REQUIRED_WORDS,
  },

  8: {
    id: "daily_8bar",
    title: `${DAILY_TITLE} — Hard`,
    description: "The full verse. Every bar has a job. Build the world, hit the punchline, bring it full circle.",
    barCount: 8,
    rules: [
      {
        type: "RHYME_SCHEME",
        rhymeScheme: "AABBCCDD",
        description: "Couplet rhyme scheme: AABBCCDD.",
      },
      {
        type: "METAPHOR",
        lineIndex: 2,
        description: "Line 3 must be a metaphor.",
      },
      {
        type: "PUNCHLINE",
        lineIndex: 3,
        description: "Line 4 must land as a punchline.",
      },
      {
        type: "INTERNAL_RHYME",
        lineIndex: 4,
        description: "Line 5 must include an internal rhyme.",
      },
      {
        type: "THEME_REFERENCE",
        theme: "pressure",
        lineIndex: 5,
        description: "Line 6 must reference the theme of pressure or confidence.",
      },
      {
        type: "ALLITERATION",
        lineIndex: 6,
        description: "Line 7 must include alliteration — build toward the finish.",
      },
      {
        type: "CALLBACK",
        lineIndex: 7,
        description: "Line 8 must callback to Line 1 or an earlier idea.",
      },
      REQUIRED_RULE,
    ],
    requiredWords: DAILY_REQUIRED_WORDS,
  },
};

export function getDailyVariant(barCount: DailyBarCount): DailyChallengeVariant {
  return DAILY_VARIANTS[barCount];
}

// ─── Conversion helper ────────────────────────────────────────────────────────
// Converts a DailyChallengeVariant into the ChallengeDTO shape used by
// LyricPuzzleCanvas, the room API, and the room store.

import type { ChallengeDTO } from "./types";

export function variantToChallengeDTO(variant: DailyChallengeVariant): ChallengeDTO {
  return {
    id: variant.id,
    title: variant.title,
    description: variant.description,
    barCount: variant.barCount,
    rules: variant.rules.map((r, i) => ({
      id: `${variant.id}_rule_${i}`,
      type: r.type,
      lineIndex: r.lineIndex ?? null,
      targetLine: r.targetLine ?? null,
      rhymeScheme: r.rhymeScheme ?? null,
      theme: r.theme ?? null,
      description: r.description,
      sortOrder: i,
    })),
    requiredWords: variant.requiredWords.map((w, i) => ({
      id: `${variant.id}_word_${i}`,
      word: w,
      sortOrder: i,
    })),
  };
}

// ─── Mode metadata (used on /play and /create) ────────────────────────────────

export const DAILY_MODES: Array<{
  barCount: DailyBarCount;
  label: string;
  sublabel: string;
  description: string;
  scheme: string;
}> = [
  {
    barCount: 3,
    label: "3 Bars",
    sublabel: "Quick",
    description: "Fast and punchy. One rhyme pair, one punchline.",
    scheme: "AAB",
  },
  {
    barCount: 6,
    label: "6 Bars",
    sublabel: "Standard",
    description: "The full challenge. Rhymes, metaphor, punchline, callback.",
    scheme: "AABBCC",
  },
  {
    barCount: 8,
    label: "8 Bars",
    sublabel: "Hard",
    description: "Deep cuts only. Every bar has a role. Bring it full circle.",
    scheme: "AABBCCDD",
  },
];
