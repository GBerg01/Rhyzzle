import type { ConstraintType, HighlightCategory } from "@/lib/types";

export type RuleCheckStatus = "PASS" | "NEEDS_REVIEW" | "MISSING";

/**
 * A highlight span computed by the rule engine before it is persisted.
 * lineIndex is 0-based; startIndex/endIndex are character offsets within that line.
 */
export interface ComputedHighlightSpan {
  lineIndex: number;
  startIndex: number;
  endIndex: number;
  text: string;
  category: HighlightCategory;
  confidence: number;
  explanation: string;
}

/**
 * Result of evaluating one ChallengeRule (or a derived sub-check like a rhyme pair).
 * PASS = clearly satisfied (deterministic or high-confidence heuristic).
 * NEEDS_REVIEW = probably present but we can't be sure — show a soft warning.
 * MISSING = clearly absent (e.g., required word not found).
 */
export interface RuleCheckResult {
  ruleType: ConstraintType;
  /** null = applies to the full submission (e.g. required words, line count). */
  lineIndex: number | null;
  status: RuleCheckStatus;
  /** 0.0–1.0. 1.0 for deterministic; lower for heuristics; 0 for AI placeholders. */
  confidence: number;
  explanation: string;
  highlights: ComputedHighlightSpan[];
}

export interface RunChecksOutput {
  results: RuleCheckResult[];
  /** Flat list of all highlights — convenience for DB writes. */
  allHighlights: ComputedHighlightSpan[];
}

/** Semantic color name stored with each HighlightSpan in the DB. */
export const CATEGORY_COLOR: Record<HighlightCategory, string> = {
  END_RHYME:          "blue",
  INTERNAL_RHYME:     "cyan",
  ALLITERATION:       "orange",
  ASSONANCE:          "teal",
  METAPHOR:           "green",
  SIMILE:             "teal",
  PUNCHLINE:          "purple",
  DOUBLE_MEANING:     "orange",
  CALLBACK:           "pink",
  REQUIRED_WORD:      "amber",
  FAILED_REQUIREMENT: "red",
};
