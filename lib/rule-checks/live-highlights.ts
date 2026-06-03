/**
 * Client-safe live highlight computation for the writing canvas.
 * Returns per-line highlight spans using deterministic heuristics only.
 * No AI calls, no Node APIs.
 *
 * These spans power the inline overlay in LyricPuzzleCanvas.
 * Server-side post-submit checks remain the source of truth for stored highlights.
 */

import type { ChallengeDTO, ChallengeRuleDTO } from "@/lib/types";
import type { ComputedHighlightSpan } from "./types";
import { deriveScheme, RULE_PRI } from "@/lib/lyric-meta";
import {
  checkAlliteration,
  checkEndRhymePair,
  checkThemeReference,
} from "./deterministic";
import { checkMetaphor } from "./ai-placeholder";

const SKIP_TYPES = new Set<ChallengeRuleDTO["type"]>([
  "RHYME_SCHEME", "LINE_COUNT", "REQUIRED_WORD",
]);

/**
 * Returns one ComputedHighlightSpan[] per line (indexed 0..barCount-1).
 * Designed to run on every debounced keystroke in the writing editor.
 * Only deterministic checks — subjective rules (punchline, callback) produce no spans.
 */
export function getLiveHighlightSpans(
  lines: string[],
  challenge: ChallengeDTO,
): ComputedHighlightSpan[][] {
  const { barCount, rules, requiredWords: reqWords } = challenge;
  const result: ComputedHighlightSpan[][] = Array.from({ length: barCount }, () => []);

  // ── 1. Required words — whole-word, case-insensitive, every occurrence ──────
  for (const rw of reqWords) {
    const re = new RegExp(
      `\\b${rw.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
      "gi",
    );
    for (let i = 0; i < barCount; i++) {
      const line = lines[i] ?? "";
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(line)) !== null) {
        result[i].push({
          lineIndex: i,
          startIndex: m.index,
          endIndex: m.index + m[0].length,
          text: m[0],
          category: "REQUIRED_WORD",
          confidence: 1.0,
          explanation: `Required word "${rw.word}"`,
        });
      }
    }
  }

  // ── 2. End rhymes — highlight end word of each filled line in each rhyme group ──
  const scheme = deriveScheme(barCount, rules);
  const visitedLetters = new Set<string>();

  for (let i = 0; i < barCount; i++) {
    const letter = scheme[i];
    if (visitedLetters.has(letter)) continue;
    visitedLetters.add(letter);

    // Collect all line indices for this scheme letter
    const group: number[] = [];
    for (let j = 0; j < barCount; j++) {
      if (scheme[j] === letter) group.push(j);
    }
    if (group.length < 2) continue;

    // Check each pair within the group
    for (let a = 0; a < group.length - 1; a++) {
      for (let b = a + 1; b < group.length; b++) {
        const li = group[a], lj = group[b];
        if (!(lines[li] ?? "").trim() || !(lines[lj] ?? "").trim()) continue;

        const check = checkEndRhymePair(lines, li, lj);
        if (check.status === "MISSING") continue;

        const conf = check.status === "PASS" ? 0.9 : 0.55;

        for (const lineIdx of [li, lj]) {
          const lineText = lines[lineIdx] ?? "";
          const trimmed = lineText.trimEnd();
          const em = trimmed.match(/[a-zA-Z']+$/);
          if (!em || em.index === undefined) continue;

          const start = em.index;
          const end = em.index + em[0].length;

          // Avoid duplicate END_RHYME spans for same position
          const alreadyCovered = result[lineIdx].some(
            (s) => s.category === "END_RHYME" && s.startIndex === start,
          );
          if (alreadyCovered) continue;

          result[lineIdx].push({
            lineIndex: lineIdx,
            startIndex: start,
            endIndex: end,
            text: lineText.slice(start, end),
            category: "END_RHYME",
            confidence: conf,
            explanation:
              check.status === "PASS" ? "Rhyming end word" : "Possible slant rhyme",
          });
        }
      }
    }
  }

  // ── 3. Per-line explicit rules: alliteration, metaphor/simile, theme ────────
  for (let i = 0; i < barCount; i++) {
    const text = lines[i] ?? "";
    if (!text.trim()) continue;

    // Highest-priority explicit rule for this line
    let best: ChallengeRuleDTO | null = null;
    for (const rule of rules) {
      if (rule.lineIndex !== i || SKIP_TYPES.has(rule.type)) continue;
      const pri = RULE_PRI[rule.type] ?? 0;
      if (!best || pri > (RULE_PRI[best.type] ?? 0)) best = rule;
    }
    if (!best) continue;

    switch (best.type) {
      case "ALLITERATION": {
        const r = checkAlliteration(text, i);
        if (r.status === "PASS") result[i].push(...r.highlights);
        break;
      }
      case "METAPHOR": {
        const r = checkMetaphor(text, i);
        if (r.status === "PASS") result[i].push(...r.highlights);
        break;
      }
      case "THEME_REFERENCE": {
        if (best.theme) {
          const r = checkThemeReference(text, i, best.theme);
          if (r.status === "PASS") result[i].push(...r.highlights);
        }
        break;
      }
      default:
        break;
    }
  }

  return result;
}
