// Shared pure functions for rendering the Rhyzzle pattern board.
// Used by LyricPuzzleCanvas (editable writing) and SubmissionPatternCard (read-only voting/results).

import type { ChallengeDTO, ChallengeRuleDTO, ConstraintType } from "@/lib/types";
import type { RuleHelpKey } from "@/lib/rule-help";

// ─── Color palette ──────────────────────────────────────────────────────────

export type LineColor = "yellow" | "cyan" | "green" | "purple" | "pink" | "amber" | "orange" | "zinc";

export const C: Record<LineColor, {
  chip: string; text: string; row: string; gutter: string;
  /** Darker row tint when a line is focused — one shade above `row`. */
  rowFocused: string;
  /** Darker gutter tint when a line is focused. */
  gutterFocused: string;
  /** Very dark color-tinted text for typed input — readable on light bg. */
  textDark: string;
}> = {
  yellow: { chip: "bg-yellow-400", text: "text-zinc-900", row: "bg-yellow-50",  gutter: "bg-yellow-50/70",  rowFocused: "bg-yellow-100",  gutterFocused: "bg-yellow-100",  textDark: "text-amber-950"  },
  cyan:   { chip: "bg-cyan-400",   text: "text-zinc-900", row: "bg-cyan-50",    gutter: "bg-cyan-50/70",    rowFocused: "bg-cyan-100",    gutterFocused: "bg-cyan-100",    textDark: "text-cyan-950"   },
  green:  { chip: "bg-green-400",  text: "text-zinc-900", row: "bg-green-50",   gutter: "bg-green-50/70",   rowFocused: "bg-green-100",   gutterFocused: "bg-green-100",   textDark: "text-green-950"  },
  purple: { chip: "bg-purple-500", text: "text-white",    row: "bg-purple-50",  gutter: "bg-purple-50/70",  rowFocused: "bg-purple-100",  gutterFocused: "bg-purple-100",  textDark: "text-purple-950" },
  pink:   { chip: "bg-pink-400",   text: "text-zinc-900", row: "bg-pink-50",    gutter: "bg-pink-50/70",    rowFocused: "bg-pink-100",    gutterFocused: "bg-pink-100",    textDark: "text-pink-950"   },
  amber:  { chip: "bg-amber-400",  text: "text-zinc-900", row: "bg-amber-50",   gutter: "bg-amber-50/70",   rowFocused: "bg-amber-100",   gutterFocused: "bg-amber-100",   textDark: "text-amber-950"  },
  orange: { chip: "bg-orange-400", text: "text-zinc-900", row: "bg-orange-50",  gutter: "bg-orange-50/70",  rowFocused: "bg-orange-100",  gutterFocused: "bg-orange-100",  textDark: "text-orange-950" },
  zinc:   { chip: "bg-zinc-400",   text: "text-white",    row: "bg-zinc-50",    gutter: "bg-zinc-50/70",    rowFocused: "bg-zinc-100",    gutterFocused: "bg-zinc-100",    textDark: "text-zinc-700"   },
};

export const LETTER_COLOR: Record<string, LineColor> = {
  A: "yellow", B: "purple", C: "cyan", D: "pink",
  E: "green",  F: "orange", X: "zinc",
};

export function letterColor(l: string): LineColor {
  return LETTER_COLOR[l.toUpperCase()] ?? "zinc";
}

// ─── Rule → chip data ────────────────────────────────────────────────────────

export interface ChipData {
  label: string;
  color: LineColor;
  placeholder: string;
  helpKey: RuleHelpKey;
}

export function ruleToChip(type: ConstraintType, lineIndex: number, rhymesWithLine: number | null): ChipData {
  const rw = rhymesWithLine !== null ? rhymesWithLine + 1 : null;
  switch (type) {
    case "END_RHYME":
      return rw
        ? { label: `RHYME ↔ L${rw}`,    color: "cyan",   placeholder: `End rhyming with line ${rw}…`,                     helpKey: "RHYME_WITH_LINE" }
        : { label: "END RHYME",           color: "cyan",   placeholder: "End on a rhyming word…",                           helpKey: "END_RHYME" };
    case "INTERNAL_RHYME":
      return   { label: "INTERNAL RHYME", color: "cyan",   placeholder: "Slip a rhyme inside the bar itself…",             helpKey: "INTERNAL_RHYME" };
    case "LINE_START_RHYMES_WITH_PREVIOUS_END":
      return   { label: "CHAIN RHYME",    color: "cyan",   placeholder: `Start with a word rhyming with line ${lineIndex}'s ending…`, helpKey: "CHAIN_RHYME" };
    case "METAPHOR":
      return   { label: "METAPHOR",        color: "green",  placeholder: "Drop a vivid metaphor or image…",                helpKey: "METAPHOR" };
    case "THEME_REFERENCE":
      return   { label: "THEME",           color: "green",  placeholder: "Weave the theme into this bar…",                 helpKey: "THEME_REFERENCE" };
    case "PUNCHLINE":
      return   { label: "PUNCHLINE",       color: "purple", placeholder: "Land the punchline — make it hit…",              helpKey: "PUNCHLINE" };
    case "CALLBACK":
      return   { label: "CALLBACK",        color: "pink",   placeholder: "Echo something from earlier in the verse…",      helpKey: "CALLBACK" };
    case "ALLITERATION":
      return   { label: "ALLITERATION",    color: "amber",  placeholder: "Repeat the same starting sounds…",              helpKey: "ALLITERATION" };
    case "ASSONANCE":
      return   { label: "ASSONANCE",       color: "cyan",   placeholder: "Let vowel sounds echo across the line…",         helpKey: "ASSONANCE" };
    case "REQUIRED_WORD":
      return   { label: "USE REQ. WORDS",  color: "amber",  placeholder: "Weave the required words in here…",             helpKey: "REQUIRED_WORD" };
    default:
      return   { label: "WRITE",           color: "zinc",   placeholder: `Bar ${lineIndex + 1}…`,                          helpKey: "WRITE" };
  }
}

// ─── Scheme derivation ───────────────────────────────────────────────────────

export function deriveScheme(barCount: number, rules: ChallengeRuleDTO[]): string[] {
  // 1. Explicit RHYME_SCHEME rule
  const sr = rules.find((r) => r.type === "RHYME_SCHEME" && r.rhymeScheme);
  if (sr?.rhymeScheme) {
    const letters = sr.rhymeScheme.toUpperCase().replace(/[^A-Z]/g, "").split("").slice(0, barCount);
    while (letters.length < barCount) letters.push("X");
    return letters;
  }

  // 2. Infer from END_RHYME pairs
  const pairs = rules.filter(
    (r) => r.type === "END_RHYME" && r.lineIndex !== null && r.targetLine !== null,
  );
  if (pairs.length > 0) {
    const groups: (string | null)[] = new Array(barCount).fill(null);
    let code = 65;
    for (const p of pairs) {
      const li = p.lineIndex!;
      const tl = p.targetLine!;
      if (li >= barCount || tl >= barCount) continue;
      const gL = groups[li], gT = groups[tl];
      if (gL && !gT) groups[tl] = gL;
      else if (!gL && gT) groups[li] = gT;
      else if (!gL && !gT) {
        const letter = String.fromCharCode(code++);
        groups[li] = letter;
        groups[tl] = letter;
      }
    }
    for (let i = 0; i < barCount; i++) {
      if (!groups[i]) groups[i] = String.fromCharCode(code++);
    }
    return groups as string[];
  }

  // 3. Default: couplet AABBCCDD…
  const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return Array.from({ length: barCount }, (_, i) => ALPHA[Math.floor(i / 2)] ?? "X");
}

// ─── Per-line metadata ───────────────────────────────────────────────────────

export interface LineMeta {
  lineIndex: number;
  schemeLetter: string;
  chip: ChipData;
  rhymesWithLine: number | null;
}

export const RULE_PRI: Partial<Record<ConstraintType, number>> = {
  PUNCHLINE: 10, CALLBACK: 9, METAPHOR: 8, THEME_REFERENCE: 7,
  INTERNAL_RHYME: 6, END_RHYME: 5, LINE_START_RHYMES_WITH_PREVIOUS_END: 4,
  ALLITERATION: 3, ASSONANCE: 2, REQUIRED_WORD: 1,
};

// ─── Multi-chip helper ───────────────────────────────────────────────────────

/**
 * Returns ALL rule chips for a given line — primary (highest priority explicit rule)
 * followed by any secondary chips (e.g. rhyme relationship when not already covered).
 * Used to display multiple badges per line in the writing canvas and result cards.
 */
export interface LineChip {
  key: string;
  label: string;
  color: LineColor;
  helpKey: RuleHelpKey;
  priority: "primary" | "secondary";
  /** Non-null for chips that represent a rhyme relationship. */
  rhymesWithLine: number | null;
}

const RHYME_RULE_TYPES = new Set<ConstraintType>([
  "END_RHYME",
  "LINE_START_RHYMES_WITH_PREVIOUS_END",
]);

const SKIP_RULE_TYPES = new Set<ConstraintType>([
  "RHYME_SCHEME",
  "LINE_COUNT",
  "REQUIRED_WORD",
]);

export function getLineAllChips(
  lineIndex: number,
  challenge: ChallengeDTO,
  scheme: string[],
): LineChip[] {
  const { rules } = challenge;

  const letter = scheme[lineIndex] ?? "X";
  const firstOf = scheme.indexOf(letter);
  const isFirst = firstOf === lineIndex;
  const rhymesWithLine = isFirst ? null : firstOf;

  // All explicit rules for this line, sorted by priority descending
  const explicitRules = rules
    .filter((r) => r.lineIndex === lineIndex && !SKIP_RULE_TYPES.has(r.type))
    .sort((a, b) => (RULE_PRI[b.type] ?? 0) - (RULE_PRI[a.type] ?? 0));

  const chips: LineChip[] = [];

  if (explicitRules.length > 0) {
    for (let idx = 0; idx < explicitRules.length; idx++) {
      const rule = explicitRules[idx];
      const chipData = ruleToChip(rule.type, lineIndex, idx === 0 && RHYME_RULE_TYPES.has(rule.type) ? rhymesWithLine : null);
      chips.push({
        key: `rule-${rule.type}-${lineIndex}`,
        label: chipData.label,
        color: chipData.color,
        helpKey: chipData.helpKey,
        priority: idx === 0 ? "primary" : "secondary",
        rhymesWithLine: RHYME_RULE_TYPES.has(rule.type) ? rhymesWithLine : null,
      });
    }

    // Add secondary rhyme chip if primary doesn't already cover the rhyme relationship
    const primaryIsRhyme = RHYME_RULE_TYPES.has(explicitRules[0].type);
    if (!isFirst && !primaryIsRhyme && rhymesWithLine !== null) {
      chips.push({
        key: `rhyme-secondary-${lineIndex}`,
        label: `RHYME ↔ L${rhymesWithLine + 1}`,
        color: "cyan",
        helpKey: "RHYME_WITH_LINE",
        priority: "secondary",
        rhymesWithLine,
      });
    }
  } else if (!isFirst && rhymesWithLine !== null) {
    chips.push({
      key: `rhyme-${lineIndex}`,
      label: `RHYME ↔ L${rhymesWithLine + 1}`,
      color: "cyan",
      helpKey: "RHYME_WITH_LINE",
      priority: "primary",
      rhymesWithLine,
    });
  } else {
    chips.push({
      key: `setup-${lineIndex}`,
      label: "SETUP RHYME",
      color: "yellow",
      helpKey: "SETUP_RHYME",
      priority: "primary",
      rhymesWithLine: null,
    });
  }

  return chips;
}

export function buildMeta(challenge: ChallengeDTO): LineMeta[] {
  const { barCount, rules } = challenge;
  const scheme = deriveScheme(barCount, rules);

  const byLine = new Map<number, ChallengeRuleDTO>();
  for (const rule of rules) {
    if (rule.lineIndex === null || rule.type === "RHYME_SCHEME") continue;
    const existing = byLine.get(rule.lineIndex);
    const pri = RULE_PRI[rule.type] ?? 0;
    if (!existing || pri > (RULE_PRI[existing.type] ?? 0)) byLine.set(rule.lineIndex, rule);
  }

  const firstOf = new Map<string, number>();
  for (let i = 0; i < scheme.length; i++) {
    if (!firstOf.has(scheme[i])) firstOf.set(scheme[i], i);
  }

  return scheme.map((letter, i) => {
    const isFirst = firstOf.get(letter) === i;
    const rhymesWithLine = isFirst ? null : (firstOf.get(letter) ?? null);
    const explicit = byLine.get(i);

    let chip: ChipData;
    if (explicit) {
      chip = ruleToChip(explicit.type, i, rhymesWithLine);
    } else if (!isFirst) {
      const rw = rhymesWithLine !== null ? rhymesWithLine + 1 : null;
      chip = {
        label: rw ? `RHYME ↔ L${rw}` : "END RHYME",
        color: "cyan",
        placeholder: rw ? `End rhyming with line ${rw}…` : "End on a rhyming word…",
        helpKey: rw ? "RHYME_WITH_LINE" : "END_RHYME",
      };
    } else {
      chip = {
        label: "SETUP RHYME",
        color: "yellow",
        placeholder: "Set up your rhyme — drop the first line…",
        helpKey: "SETUP_RHYME",
      };
    }

    return { lineIndex: i, schemeLetter: letter, chip, rhymesWithLine };
  });
}
