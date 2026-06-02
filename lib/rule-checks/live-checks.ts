/**
 * Client-side live check runner for the writing editor.
 * Pure TS — no Node APIs, no DB, no AI calls.
 * Runs on every debounced keystroke to give the user in-editor guidance.
 *
 * These results are GUIDANCE ONLY. Server-side checks after submit are the
 * source of truth for stored highlights.
 */

import type { ChallengeDTO, ChallengeRuleDTO } from "@/lib/types";
import { deriveScheme, RULE_PRI } from "@/lib/lyric-meta";
import {
  checkAlliteration,
  checkEndRhymePair,
  checkChainRhyme,
  checkThemeReference,
} from "./deterministic";
import { checkMetaphor } from "./ai-placeholder";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type LineStatus = "empty" | "in_progress" | "looks_good" | "needs_review";

export interface LineHint {
  status: LineStatus;
  /** Short label shown near the rule chip (e.g. "3 words on 'S' ✓"). */
  ruleHint: string | null;
  /** Shown below the input for rhyme-pair lines once the partner has text. */
  rhymeHint: string | null;
  /**
   * True for subjective rules (punchline, callback, assonance, internal rhyme).
   * Canvas shows "→ submit" near the chip instead of a definitive indicator.
   */
  isSubjectiveRule: boolean;
}

export interface RequiredWordStatus {
  word: string;
  found: boolean;
}

export interface LiveCheckState {
  requiredWords: RequiredWordStatus[];
  /** lineHints[i] is the hint for line i. Length === challenge.barCount. */
  lineHints: LineHint[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Last alphabetic word of a line, lowercased. */
function lineEndWord(text: string): string {
  const words = text.trim().match(/[a-zA-Z']+/g) ?? [];
  return (words[words.length - 1] ?? "").toLowerCase().replace(/[^a-z]/g, "");
}

/** Whole-word, case-insensitive check. */
function wordInLine(word: string, line: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(line);
}

/**
 * Returns the highest-priority explicit rule for `lineIndex`, ignoring scheme/
 * line-count/required-word rules (those are handled separately).
 */
function effectiveRule(rules: ChallengeRuleDTO[], lineIndex: number): ChallengeRuleDTO | null {
  let best: ChallengeRuleDTO | null = null;
  for (const rule of rules) {
    if (rule.lineIndex !== lineIndex) continue;
    if (
      rule.type === "RHYME_SCHEME" ||
      rule.type === "REQUIRED_WORD" ||
      rule.type === "LINE_COUNT"
    )
      continue;
    const pri = RULE_PRI[rule.type] ?? 0;
    if (!best || pri > (RULE_PRI[best.type] ?? 0)) best = rule;
  }
  return best;
}

// ─── Main function ─────────────────────────────────────────────────────────────

export function runLiveChecks(lines: string[], challenge: ChallengeDTO): LiveCheckState {
  const { barCount, rules, requiredWords: reqWords } = challenge;

  // Required words — simple per-word scan
  const requiredWords: RequiredWordStatus[] = reqWords.map((rw) => ({
    word: rw.word,
    found: lines.some((l) => wordInLine(rw.word, l)),
  }));

  // Derive rhyme scheme once
  const scheme = deriveScheme(barCount, rules);

  const lineHints: LineHint[] = Array.from({ length: barCount }, (_, i) => {
    const text = lines[i] ?? "";

    if (!text.trim()) {
      return { status: "empty", ruleHint: null, rhymeHint: null, isSubjectiveRule: false };
    }

    let status: LineStatus = "in_progress";
    let ruleHint: string | null = null;
    let isSubjectiveRule = false;

    // ── Explicit rule check ───────────────────────────────────────────────────
    const rule = effectiveRule(rules, i);
    if (rule) {
      switch (rule.type) {
        case "ALLITERATION": {
          const r = checkAlliteration(text, i);
          if (r.status === "PASS") {
            const m = r.explanation.match(/'([A-Z])'/);
            const letter = m?.[1] ?? "";
            ruleHint = letter
              ? `${r.highlights.length} words on '${letter}' ✓`
              : "Alliteration ✓";
            status = "looks_good";
          } else {
            ruleHint = "Try more same-starting words";
            status = "needs_review";
          }
          break;
        }

        case "METAPHOR": {
          const r = checkMetaphor(text, i);
          if (r.status === "PASS") {
            ruleHint = "Pattern detected";
            status = "looks_good";
          } else {
            // Fall through — show "→ submit" since heuristic couldn't confirm
            isSubjectiveRule = true;
          }
          break;
        }

        // Purely subjective — cannot determine locally
        case "PUNCHLINE":
        case "CALLBACK":
        case "ASSONANCE":
        case "INTERNAL_RHYME":
          isSubjectiveRule = true;
          break;

        case "LINE_START_RHYMES_WITH_PREVIOUS_END": {
          const prevText = lines[i - 1] ?? "";
          if (prevText.trim()) {
            const r = checkChainRhyme(lines, i);
            if (r.status === "PASS") {
              ruleHint = "Chain connected ✓";
              status = "looks_good";
            } else {
              const pe = lineEndWord(prevText);
              ruleHint = pe ? `Start with a rhyme for "${pe}"` : null;
              status = "needs_review";
            }
          }
          break;
        }

        case "THEME_REFERENCE": {
          if (rule.theme) {
            const r = checkThemeReference(text, i, rule.theme);
            if (r.status === "PASS") {
              ruleHint = "Theme referenced ✓";
              status = "looks_good";
            } else {
              ruleHint = `Weave in "${rule.theme}"`;
              status = "needs_review";
            }
          }
          break;
        }

        case "END_RHYME":
          // Handled by the rhyme hint logic below
          break;

        default:
          break;
      }
    }

    // ── Rhyme hint ────────────────────────────────────────────────────────────
    // Find a partner line with the same scheme letter that already has text.
    let rhymeHint: string | null = null;
    const letter = scheme[i];
    const partnerIdx = scheme.findIndex(
      (l, j) => l === letter && j !== i && (lines[j] ?? "").trim().length > 0,
    );

    if (partnerIdx >= 0) {
      const a = Math.min(i, partnerIdx);
      const b = Math.max(i, partnerIdx);
      const r = checkEndRhymePair(lines, a, b);
      if (r.status === "PASS") {
        rhymeHint = "Rhyme connected ✓";
        if (status === "in_progress") status = "looks_good";
      } else {
        const partnerEnd = lineEndWord(lines[partnerIdx] ?? "");
        rhymeHint = partnerEnd ? `Connect to "${partnerEnd}"` : "Connect the end sounds";
        if (status === "in_progress") status = "needs_review";
      }
    }

    return { status, ruleHint, rhymeHint, isSubjectiveRule };
  });

  return { requiredWords, lineHints };
}
