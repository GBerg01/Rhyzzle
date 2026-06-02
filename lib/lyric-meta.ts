// Shared pure functions for rendering the Rhyzzle pattern board.
// Used by LyricPuzzleCanvas (editable writing) and SubmissionPatternCard (read-only voting/results).

import type { ChallengeDTO, ChallengeRuleDTO, ConstraintType } from "@/lib/types";
import type { RuleHelpKey } from "@/lib/rule-help";

// ─── Color palette ──────────────────────────────────────────────────────────

export type LineColor = "yellow" | "cyan" | "green" | "purple" | "pink" | "amber" | "orange" | "zinc";

export const C: Record<LineColor, { chip: string; text: string; row: string; gutter: string }> = {
  yellow: { chip: "bg-yellow-400", text: "text-zinc-900", row: "bg-yellow-50",  gutter: "bg-yellow-50/70"  },
  cyan:   { chip: "bg-cyan-400",   text: "text-zinc-900", row: "bg-cyan-50",    gutter: "bg-cyan-50/70"    },
  green:  { chip: "bg-green-400",  text: "text-zinc-900", row: "bg-green-50",   gutter: "bg-green-50/70"   },
  purple: { chip: "bg-purple-500", text: "text-white",    row: "bg-purple-50",  gutter: "bg-purple-50/70"  },
  pink:   { chip: "bg-pink-400",   text: "text-zinc-900", row: "bg-pink-50",    gutter: "bg-pink-50/70"    },
  amber:  { chip: "bg-amber-400",  text: "text-zinc-900", row: "bg-amber-50",   gutter: "bg-amber-50/70"   },
  orange: { chip: "bg-orange-400", text: "text-zinc-900", row: "bg-orange-50",  gutter: "bg-orange-50/70"  },
  zinc:   { chip: "bg-zinc-400",   text: "text-white",    row: "bg-zinc-50",    gutter: "bg-zinc-50/70"    },
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
