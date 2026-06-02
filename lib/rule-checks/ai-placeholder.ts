/**
 * AI-placeholder rule checks.
 * These cover subjective writing devices (metaphor, punchline, callback, etc.)
 * where confident detection requires semantic understanding.
 *
 * Current approach: simple heuristics where possible; NEEDS_REVIEW otherwise.
 * TODOs below mark where real AI calls would go in Phase 5.
 *
 * IMPORTANT: These functions never return definitive MISSING for subjective rules.
 * "Needs review" is the worst state — users can still submit and humans still vote.
 */

import type { RuleCheckResult, ComputedHighlightSpan } from "./types";

// ─── Metaphor ──────────────────────────────────────────────────────────────────

/**
 * Heuristic: looks for common metaphor/simile patterns.
 * Patterns: "X is a Y", "X was a Y", "X are Y", "like a Y", "like the Y",
 *           "feel like", "look like", "sound like", "turns into".
 *
 * If pattern found → PASS (confidence 0.65 — this is a heuristic, not AI).
 * If not found → NEEDS_REVIEW (cannot confirm absence of metaphor).
 *
 * TODO Phase 5: replace with Claude API call to detect the metaphor phrase
 * and return the highlighted span.
 */
export function checkMetaphor(line: string, lineIndex: number): RuleCheckResult {
  const lower = line.toLowerCase();

  // Simile patterns (explicit comparison)
  const similePatterns = [
    /\blike (a|an|the)\b/,
    /\bas (a|an|the)\b/,
    /\bfeel like\b/,
    /\blooks? like\b/,
    /\bsound like\b/,
    /\bacts? like\b/,
  ];

  // Metaphor patterns (implicit comparison: "X is a Y")
  const metaphorPatterns = [
    /\bis (a|an|the)\b/,
    /\bwas (a|an|the)\b/,
    /\bare (a|an|the)\b/,
    /\bbecomes?\b/,
    /\bturns? into\b/,
    /\btransforms?\b/,
  ];

  let matchedPattern: RegExp | null = null;
  let matchedIndex = -1;
  let matchedLength = 0;
  let isMeta = false;

  for (const pat of similePatterns) {
    const m = lower.match(pat);
    if (m?.index !== undefined) {
      matchedPattern = pat;
      matchedIndex = m.index;
      matchedLength = m[0].length;
      break;
    }
  }

  if (!matchedPattern) {
    for (const pat of metaphorPatterns) {
      const m = lower.match(pat);
      if (m?.index !== undefined) {
        matchedPattern = pat;
        matchedIndex = m.index;
        matchedLength = m[0].length;
        isMeta = true;
        break;
      }
    }
  }

  if (matchedPattern && matchedIndex >= 0) {
    const highlights: ComputedHighlightSpan[] = [{
      lineIndex,
      startIndex: matchedIndex,
      endIndex: matchedIndex + matchedLength,
      text: line.slice(matchedIndex, matchedIndex + matchedLength),
      category: "METAPHOR",
      confidence: 0.65,
      explanation: isMeta
        ? "Possible metaphor detected (\"is a\" pattern — heuristic)."
        : "Possible simile detected (\"like a\" pattern — heuristic).",
    }];
    return {
      ruleType: "METAPHOR",
      lineIndex,
      status: "PASS",
      confidence: 0.65,
      explanation: isMeta
        ? "Metaphor pattern detected (heuristic — not AI)."
        : "Simile pattern detected (heuristic — not AI).",
      highlights,
    };
  }

  // TODO Phase 5: call AI to check for abstract metaphor
  return {
    ruleType: "METAPHOR",
    lineIndex,
    status: "NEEDS_REVIEW",
    confidence: 0,
    explanation:
      "Couldn't detect a metaphor pattern yet — may be present but not detectable without AI.",
    highlights: [],
  };
}

// ─── Punchline ────────────────────────────────────────────────────────────────

/**
 * Heuristic: exclamation marks, rhetorical questions, or wordplay indicators.
 * Very weak signal — punchlines are highly subjective.
 *
 * TODO Phase 5: AI semantic check — does this line subvert an expectation or
 * deliver a surprising twist relative to the preceding bars?
 */
export function checkPunchline(line: string, lineIndex: number): RuleCheckResult {
  const lower = line.toLowerCase();

  // Very weak heuristics
  const hasPunct = /[!?]$/.test(line.trim());
  const hasWordplay = /\b(get it|ya feel|feel me|you heard|facts|real talk|no cap|bar)\b/.test(lower);

  if (hasPunct || hasWordplay) {
    return {
      ruleType: "PUNCHLINE",
      lineIndex,
      status: "NEEDS_REVIEW", // still NEEDS_REVIEW — heuristic too weak to PASS
      confidence: 0.4,
      explanation:
        "Possible punchline indicator detected — but punchlines are subjective. Humans will judge.",
      highlights: [],
    };
  }

  // TODO Phase 5: AI check
  return {
    ruleType: "PUNCHLINE",
    lineIndex,
    status: "NEEDS_REVIEW",
    confidence: 0,
    explanation:
      "Punchlines require semantic understanding — AI check coming in Phase 5. Humans will vote on whether this lands.",
    highlights: [],
  };
}

// ─── Callback ─────────────────────────────────────────────────────────────────

/**
 * Heuristic: look for shared significant words between this line and the target line.
 * Only triggers if targetLine is provided and lines are available.
 *
 * TODO Phase 5: AI semantic check — does line N reference/echo line M thematically?
 */
export function checkCallback(
  lines: string[],
  lineIndex: number,
  targetLine: number | null,
): RuleCheckResult {
  if (targetLine !== null && targetLine < lines.length) {
    const targetWords = new Set(
      (lines[targetLine].toLowerCase().match(/\b[a-z]{4,}\b/g) ?? []).filter(
        (w) => !FILLER_WORDS.has(w),
      ),
    );
    const thisWords = (lines[lineIndex].toLowerCase().match(/\b[a-z]{4,}\b/g) ?? []).filter(
      (w) => !FILLER_WORDS.has(w),
    );

    const shared = thisWords.filter((w) => targetWords.has(w));
    if (shared.length > 0) {
      return {
        ruleType: "CALLBACK",
        lineIndex,
        status: "NEEDS_REVIEW",
        confidence: 0.45,
        explanation: `Shared word${shared.length > 1 ? "s" : ""} with line ${targetLine + 1} ("${shared.slice(0, 2).join('", "')}") — may be a callback. Humans will judge.`,
        highlights: [],
      };
    }
  }

  // TODO Phase 5: AI semantic check for thematic callback
  return {
    ruleType: "CALLBACK",
    lineIndex,
    status: "NEEDS_REVIEW",
    confidence: 0,
    explanation:
      "Callbacks require semantic understanding — AI check coming in Phase 5. Humans will vote.",
    highlights: [],
  };
}

// ─── Internal rhyme ───────────────────────────────────────────────────────────

/**
 * Heuristic: look for two words within the line that share the same ending.
 * Only catches simple cases ("I shine all the time" → shine/time).
 *
 * TODO Phase 5: AI phonetic analysis for true internal rhyme detection.
 */
export function checkInternalRhyme(line: string, lineIndex: number): RuleCheckResult {
  const words = line.toLowerCase().match(/\b[a-z]{3,}\b/g) ?? [];
  if (words.length < 4) {
    return {
      ruleType: "INTERNAL_RHYME",
      lineIndex,
      status: "NEEDS_REVIEW",
      confidence: 0,
      explanation: "Line too short to detect internal rhyme — review manually.",
      highlights: [],
    };
  }

  // Simple: check if any two non-adjacent words share last 2 chars
  for (let i = 0; i < words.length - 2; i++) {
    for (let j = i + 2; j < words.length; j++) {
      const endA = words[i].slice(-2), endB = words[j].slice(-2);
      if (endA.length >= 2 && endA === endB && words[i] !== words[j]) {
        const startA = findWordStart(line, words[i]);
        const startB = findWordStart(line, words[j], startA + 1);

        const highlights: ComputedHighlightSpan[] = [];
        if (startA >= 0) highlights.push({ lineIndex, startIndex: startA, endIndex: startA + words[i].length, text: words[i], category: "INTERNAL_RHYME", confidence: 0.6, explanation: "Possible internal rhyme (heuristic)." });
        if (startB >= 0) highlights.push({ lineIndex, startIndex: startB, endIndex: startB + words[j].length, text: words[j], category: "INTERNAL_RHYME", confidence: 0.6, explanation: "Possible internal rhyme (heuristic)." });

        return {
          ruleType: "INTERNAL_RHYME",
          lineIndex,
          status: "NEEDS_REVIEW", // heuristic too weak to PASS
          confidence: 0.6,
          explanation: `Possible internal rhyme: "${words[i]}" / "${words[j]}" (heuristic).`,
          highlights,
        };
      }
    }
  }

  // TODO Phase 5: phonetic analysis
  return {
    ruleType: "INTERNAL_RHYME",
    lineIndex,
    status: "NEEDS_REVIEW",
    confidence: 0,
    explanation:
      "Internal rhymes need phonetic analysis — AI check coming in Phase 5.",
    highlights: [],
  };
}

// ─── Assonance ────────────────────────────────────────────────────────────────

/**
 * TODO Phase 5: phonetic vowel analysis.
 * Current placeholder always returns NEEDS_REVIEW.
 */
export function checkAssonance(line: string, lineIndex: number): RuleCheckResult {
  void line;
  return {
    ruleType: "ASSONANCE",
    lineIndex,
    status: "NEEDS_REVIEW",
    confidence: 0,
    explanation:
      "Assonance detection needs phonetic analysis — AI check coming in Phase 5.",
    highlights: [],
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FILLER_WORDS = new Set([
  "that", "this", "with", "from", "they", "them", "their", "have",
  "been", "will", "would", "could", "should", "just", "like", "also",
]);

function findWordStart(line: string, word: string, fromIndex = 0): number {
  const lower = line.toLowerCase();
  return lower.indexOf(word, fromIndex);
}
