/**
 * Orchestrator: runs all rule checks for a submission.
 * Calls deterministic checks for objective rules, AI-placeholder checks for subjective ones.
 * Returns a flat list of RuleCheckResults + all ComputedHighlightSpans.
 *
 * Used by the submit API route after saving the submission to the DB.
 * Does NOT write to the database — that is the caller's responsibility.
 */

import type { ChallengeDTO } from "@/lib/types";
import { deriveScheme } from "@/lib/lyric-meta";
import type { RunChecksOutput, RuleCheckResult } from "./types";
import {
  checkLineCount,
  checkRequiredWords,
  checkAlliteration,
  checkRhymeScheme,
  checkEndRhymePair,
  checkChainRhyme,
  checkThemeReference,
} from "./deterministic";
import {
  checkMetaphor,
  checkPunchline,
  checkCallback,
  checkInternalRhyme,
  checkAssonance,
} from "./ai-placeholder";

export function runRuleChecks(lines: string[], challenge: ChallengeDTO): RunChecksOutput {
  const results: RuleCheckResult[] = [];

  // 1. Line count — always run
  results.push(checkLineCount(lines, challenge.barCount));

  // 2. Required words — always run (uses challenge.requiredWords)
  results.push(checkRequiredWords(lines, challenge.requiredWords));

  // 3. Rhyme scheme — derive from challenge and run pair checks
  const scheme = deriveScheme(challenge.barCount, challenge.rules);
  const hasRhymeSchemeRule = challenge.rules.some((r) => r.type === "RHYME_SCHEME");
  if (hasRhymeSchemeRule) {
    const pairResults = checkRhymeScheme(lines, scheme);
    results.push(...pairResults);
  }

  // 4. Per-rule checks
  for (const rule of challenge.rules) {
    const lineIdx = rule.lineIndex ?? 0;
    const lineText = lines[lineIdx] ?? "";

    switch (rule.type) {
      case "RHYME_SCHEME":
        // Handled above as a group — skip individual processing
        break;

      case "END_RHYME":
        if (!hasRhymeSchemeRule && rule.lineIndex !== null && rule.targetLine !== null) {
          // Only process explicit END_RHYME pairs when there is no RHYME_SCHEME rule
          results.push(checkEndRhymePair(lines, rule.lineIndex, rule.targetLine));
        }
        break;

      case "LINE_START_RHYMES_WITH_PREVIOUS_END":
        if (rule.lineIndex !== null) {
          results.push(checkChainRhyme(lines, rule.lineIndex));
        }
        break;

      case "ALLITERATION":
        if (rule.lineIndex !== null) {
          results.push(checkAlliteration(lineText, lineIdx));
        }
        break;

      case "METAPHOR":
        if (rule.lineIndex !== null) {
          results.push(checkMetaphor(lineText, lineIdx));
        }
        break;

      case "PUNCHLINE":
        if (rule.lineIndex !== null) {
          results.push(checkPunchline(lineText, lineIdx));
        }
        break;

      case "CALLBACK":
        if (rule.lineIndex !== null) {
          results.push(checkCallback(lines, lineIdx, rule.targetLine));
        }
        break;

      case "INTERNAL_RHYME":
        if (rule.lineIndex !== null) {
          results.push(checkInternalRhyme(lineText, lineIdx));
        }
        break;

      case "ASSONANCE":
        if (rule.lineIndex !== null) {
          results.push(checkAssonance(lineText, lineIdx));
        }
        break;

      case "THEME_REFERENCE":
        if (rule.lineIndex !== null && rule.theme) {
          results.push(checkThemeReference(lineText, lineIdx, rule.theme));
        }
        break;

      case "REQUIRED_WORD":
      case "LINE_COUNT":
        // Already handled above
        break;

      default:
        // Unknown rule type — skip silently rather than crash
        break;
    }
  }

  // Flatten all highlights
  const allHighlights = results.flatMap((r) => r.highlights);

  return { results, allHighlights };
}
