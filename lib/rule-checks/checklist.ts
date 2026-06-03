/**
 * Builds the live Rhyzzle checklist from current bar text and challenge definition.
 * Pure TS — no AI, no Node APIs, no DB.
 * Called on every debounced keystroke from RhyzzleChecklist component.
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

export type ChecklistStatus = "COMPLETE" | "NEEDS_REVIEW" | "MISSING" | "CHECK_AFTER_SUBMIT";

export interface ChecklistItem {
  id: string;
  label: string;
  detail?: string;
  status: ChecklistStatus;
  relatedLines?: number[];
  /** Only present on the required-words item — rendered as individual chips. */
  wordChips?: { word: string; found: boolean }[];
}

export interface ChecklistState {
  items: ChecklistItem[];
  completeCount: number;
  needsReviewCount: number;
  missingCount: number;
  afterSubmitCount: number;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const SUBJECTIVE_TYPES = new Set<ChallengeRuleDTO["type"]>([
  "PUNCHLINE", "CALLBACK", "ASSONANCE", "INTERNAL_RHYME",
]);

const RULE_LABELS: Partial<Record<ChallengeRuleDTO["type"], string>> = {
  PUNCHLINE:   "Punchline",
  CALLBACK:    "Callback",
  ASSONANCE:   "Assonance",
  INTERNAL_RHYME: "Internal Rhyme",
  ALLITERATION: "Alliteration",
  METAPHOR:    "Metaphor / Imagery",
  THEME_REFERENCE: "Theme Reference",
  LINE_START_RHYMES_WITH_PREVIOUS_END: "Chain Rhyme",
  END_RHYME:   "End Rhyme",
};

/** Rules that are scheme/structural — handled separately, not as per-line items. */
const SKIP_TYPES = new Set<ChallengeRuleDTO["type"]>([
  "RHYME_SCHEME", "LINE_COUNT", "REQUIRED_WORD", "END_RHYME",
]);

// ─── Main function ─────────────────────────────────────────────────────────────

export function buildChecklist(lines: string[], challenge: ChallengeDTO): ChecklistState {
  const { barCount, rules, requiredWords: reqWords } = challenge;
  const items: ChecklistItem[] = [];

  // ── 1. Bar count ──────────────────────────────────────────────────────────────
  const filledCount = lines.filter((l) => (l ?? "").trim().length > 0).length;
  const allFilled = filledCount === barCount;
  items.push({
    id: "bars",
    label: `Bars: ${filledCount} / ${barCount}`,
    status: allFilled ? "COMPLETE" : filledCount === 0 ? "MISSING" : "NEEDS_REVIEW",
  });

  // ── 2. Required words ─────────────────────────────────────────────────────────
  if (reqWords.length > 0) {
    const wordChips = reqWords.map((rw) => {
      const re = new RegExp(
        `\\b${rw.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
        "i",
      );
      return { word: rw.word, found: lines.some((l) => re.test(l ?? "")) };
    });
    const allFound = wordChips.every((w) => w.found);
    const noneFound = wordChips.every((w) => !w.found);
    items.push({
      id: "required-words",
      label: "Required words",
      status: allFound ? "COMPLETE" : noneFound ? "MISSING" : "NEEDS_REVIEW",
      wordChips,
    });
  }

  // ── 3. Rhyme groups (from scheme) ─────────────────────────────────────────────
  const scheme = deriveScheme(barCount, rules);
  const visitedLetters = new Set<string>();

  for (let i = 0; i < barCount; i++) {
    const letter = scheme[i];
    if (visitedLetters.has(letter)) continue;
    visitedLetters.add(letter);

    const group: number[] = [];
    for (let j = 0; j < barCount; j++) {
      if (scheme[j] === letter) group.push(j);
    }
    if (group.length < 2) continue;

    // Compact group label: "L1 ↔ L2" or "L1–L6" for large groups
    const lineNums =
      group.length > 3
        ? `L${group[0] + 1}–L${group[group.length - 1] + 1}`
        : group.map((n) => `L${n + 1}`).join(" ↔ ");

    const itemId = `rhyme-${letter}`;
    const relatedLines = group;

    const filledGroup = group.filter((idx) => (lines[idx] ?? "").trim().length > 0);

    if (filledGroup.length < 2) {
      items.push({
        id: itemId,
        label: `Rhyme ${letter} (${lineNums})`,
        detail: filledGroup.length === 0
          ? "Write these bars to check"
          : "Write the paired bar to check",
        status: "MISSING",
        relatedLines,
      });
      continue;
    }

    // Check all pairs — take best outcome
    let bestStatus: ChecklistStatus = "MISSING";
    let bestDetail = "";

    outer: for (let a = 0; a < filledGroup.length - 1; a++) {
      for (let b = a + 1; b < filledGroup.length; b++) {
        const check = checkEndRhymePair(lines, filledGroup[a], filledGroup[b]);
        if (check.status === "PASS") {
          bestStatus = "COMPLETE";
          bestDetail = "Rhyme connected ✓";
          break outer;
        }
        if (check.status === "NEEDS_REVIEW") {
          bestStatus = "NEEDS_REVIEW";
          bestDetail = "Possible slant rhyme ~";
        }
      }
    }

    if (bestStatus === "MISSING") {
      const endA = (lines[filledGroup[0]] ?? "").trimEnd().match(/[a-zA-Z']+$/)?.[0] ?? "";
      const endB = (lines[filledGroup[1]] ?? "").trimEnd().match(/[a-zA-Z']+$/)?.[0] ?? "";
      bestDetail = endA && endB
        ? `"${endA}" and "${endB}" — try connecting`
        : `Try connecting ${lineNums}`;
    }

    items.push({
      id: itemId,
      label: `Rhyme ${letter} (${lineNums})`,
      detail: bestDetail,
      status: bestStatus,
      relatedLines,
    });
  }

  // ── 4. Per-line explicit rules ─────────────────────────────────────────────────
  // One item per line for the highest-priority non-scheme rule.
  const lineRules = new Map<number, ChallengeRuleDTO>();
  for (const rule of rules) {
    if (rule.lineIndex === null || SKIP_TYPES.has(rule.type)) continue;
    const existing = lineRules.get(rule.lineIndex);
    const pri = RULE_PRI[rule.type] ?? 0;
    if (!existing || pri > (RULE_PRI[existing.type] ?? 0)) {
      lineRules.set(rule.lineIndex, rule);
    }
  }

  const sortedLineRules = [...lineRules.entries()].sort(([a], [b]) => a - b);

  for (const [lineIdx, rule] of sortedLineRules) {
    const text = lines[lineIdx] ?? "";
    const ruleLabel = RULE_LABELS[rule.type] ?? rule.type;
    const label = `L${lineIdx + 1} ${ruleLabel}`;
    const itemId = `rule-${lineIdx}-${rule.type}`;

    // Subjective — cannot determine deterministically
    if (SUBJECTIVE_TYPES.has(rule.type)) {
      items.push({
        id: itemId,
        label,
        detail: "Subjective — reviewed after submit",
        status: "CHECK_AFTER_SUBMIT",
        relatedLines: [lineIdx],
      });
      continue;
    }

    if (!text.trim()) {
      items.push({
        id: itemId,
        label,
        status: "MISSING",
        relatedLines: [lineIdx],
      });
      continue;
    }

    switch (rule.type) {
      case "ALLITERATION": {
        const r = checkAlliteration(text, lineIdx);
        if (r.status === "PASS") {
          const m = r.explanation.match(/'([A-Z])'/);
          const lit = m?.[1] ?? "";
          items.push({
            id: itemId,
            label,
            detail: lit
              ? `${r.highlights.length} words on '${lit}' ✓`
              : "Alliteration ✓",
            status: "COMPLETE",
            relatedLines: [lineIdx],
          });
        } else {
          items.push({
            id: itemId,
            label,
            detail: "Try more same-starting words",
            status: "NEEDS_REVIEW",
            relatedLines: [lineIdx],
          });
        }
        break;
      }

      case "METAPHOR": {
        const r = checkMetaphor(text, lineIdx);
        if (r.status === "PASS") {
          const isSim = r.highlights[0]?.category === "SIMILE";
          items.push({
            id: itemId,
            label,
            detail: isSim
              ? "Simile detected ~ (metaphor requested)"
              : "Metaphor detected ✓",
            status: isSim ? "NEEDS_REVIEW" : "COMPLETE",
            relatedLines: [lineIdx],
          });
        } else {
          items.push({
            id: itemId,
            label,
            detail: "Use figurative language — e.g. 'X is a Y'",
            status: "CHECK_AFTER_SUBMIT",
            relatedLines: [lineIdx],
          });
        }
        break;
      }

      case "THEME_REFERENCE": {
        if (!rule.theme) break;
        const r = checkThemeReference(text, lineIdx, rule.theme);
        items.push({
          id: itemId,
          label,
          detail: r.status === "PASS"
            ? `Theme "${rule.theme}" referenced ✓`
            : `Weave in "${rule.theme}"`,
          status: r.status === "PASS" ? "COMPLETE" : "NEEDS_REVIEW",
          relatedLines: [lineIdx],
        });
        break;
      }

      case "LINE_START_RHYMES_WITH_PREVIOUS_END": {
        const prevText = lines[lineIdx - 1] ?? "";
        if (!prevText.trim()) {
          items.push({
            id: itemId,
            label,
            detail: "Write the previous bar first",
            status: "MISSING",
            relatedLines: [lineIdx],
          });
          break;
        }
        const r = checkChainRhyme(lines, lineIdx);
        if (r.status === "PASS") {
          items.push({ id: itemId, label, detail: "Chain connected ✓", status: "COMPLETE", relatedLines: [lineIdx - 1, lineIdx] });
        } else {
          const prevEnd = prevText.trimEnd().match(/[a-zA-Z']+$/)?.[0] ?? "";
          items.push({
            id: itemId,
            label,
            detail: prevEnd ? `Start with a rhyme for "${prevEnd}"` : "Connect to previous bar",
            status: "NEEDS_REVIEW",
            relatedLines: [lineIdx - 1, lineIdx],
          });
        }
        break;
      }

      default:
        break;
    }
  }

  // ── Counts ────────────────────────────────────────────────────────────────────
  const completeCount    = items.filter((it) => it.status === "COMPLETE").length;
  const needsReviewCount = items.filter((it) => it.status === "NEEDS_REVIEW").length;
  const missingCount     = items.filter((it) => it.status === "MISSING").length;
  const afterSubmitCount = items.filter((it) => it.status === "CHECK_AFTER_SUBMIT").length;

  return { items, completeCount, needsReviewCount, missingCount, afterSubmitCount };
}
