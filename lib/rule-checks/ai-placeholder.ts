/**
 * AI-placeholder rule checks.
 * These cover subjective writing devices (metaphor, punchline, callback, etc.)
 * where confident detection requires semantic understanding.
 *
 * Current approach: improved heuristics where possible; NEEDS_REVIEW otherwise.
 * TODOs below mark where real AI calls would go in Phase 5B.
 *
 * IMPORTANT: These functions never return definitive MISSING for subjective rules.
 * "Needs review" is the worst state — users can still submit and humans still vote.
 */

import type { RuleCheckResult, ComputedHighlightSpan } from "./types";
import { wordsLikelyRhyme } from "./deterministic";

// ─── Phrase extraction helper ──────────────────────────────────────────────────

/**
 * Extracts a figurative phrase surrounding a pattern match.
 * Extends backward to the clause start (line start or after punctuation)
 * and forward up to 4 content words (stopping at prepositions/conjunctions).
 */
function extractPhraseAround(
  line: string,
  patStart: number,
  patEnd: number,
): { start: number; end: number } {
  // Backward: to clause start (line start or after sentence-ending punctuation)
  let start = 0;
  for (let i = patStart - 1; i >= 0; i--) {
    if (/[.!?;]/.test(line[i])) { start = i + 1; break; }
  }
  // Skip leading whitespace
  while (start < patStart && line[start] === " ") start++;

  // Forward: grab predicate noun phrase (up to 4 words, stop at prepositions/conjunctions)
  const STOP = new Set([
    "with", "but", "and", "or", "so", "if", "when", "while", "after",
    "before", "for", "on", "in", "at", "to", "of", "from", "by",
    "about", "over", "under", "into", "through", "as",
  ]);
  const rest = line.slice(patEnd);
  let end = patEnd;
  let wordCount = 0;
  const wordRe = /\b[a-zA-Z]+\b/g;
  let m: RegExpExecArray | null;
  while ((m = wordRe.exec(rest)) !== null) {
    if (wordCount >= 4) break;
    if (STOP.has(m[0].toLowerCase())) break;
    end = patEnd + m.index + m[0].length;
    wordCount++;
  }

  return { start, end: Math.min(end, line.length) };
}

// ─── Metaphor ──────────────────────────────────────────────────────────────────

/**
 * Heuristic: detects metaphor and simile patterns and highlights the full phrase.
 *
 * Metaphor patterns: "X is a Y", "X was a Y", "I'm a Y", "turns into", "becomes"
 * Simile patterns:   "like a Y", "like the Y", "feel like", "looks like"
 *
 * When a pattern is found, the highlight covers the full figurative clause
 * (from clause start to end of the predicate noun phrase) — not just the trigger words.
 *
 * TODO Phase 5B: replace with Claude API for true semantic metaphor detection.
 */
export function checkMetaphor(line: string, lineIndex: number): RuleCheckResult {
  const lower = line.toLowerCase();

  // Simile patterns
  const similePatterns: RegExp[] = [
    /\blike (a|an|the)\b/,
    /\bfeel like\b/,
    /\blooks? like\b/,
    /\bsounds? like\b/,
    /\bacts? like\b/,
  ];

  // Metaphor patterns (implicit comparison)
  const metaphorPatterns: RegExp[] = [
    /\b(i'?m|i am) (a|an|the)\b/,
    /\b(is|are|was|were) (a|an|the)\b/,
    /\bbecomes?\b/,
    /\bturns? into\b/,
    /\btransforms? (into|to)\b/,
  ];

  let matchStart = -1;
  let matchEnd = -1;
  let isSimile = false;

  for (const pat of similePatterns) {
    const m = lower.match(pat);
    if (m?.index !== undefined) {
      matchStart = m.index;
      matchEnd = m.index + m[0].length;
      isSimile = true;
      break;
    }
  }

  if (matchStart === -1) {
    for (const pat of metaphorPatterns) {
      const m = lower.match(pat);
      if (m?.index !== undefined) {
        matchStart = m.index;
        matchEnd = m.index + m[0].length;
        break;
      }
    }
  }

  if (matchStart >= 0 && matchEnd > matchStart) {
    // Expand to capture the full figurative phrase
    const phrase = extractPhraseAround(line, matchStart, matchEnd);
    // Clamp to valid range
    const spanStart = Math.max(0, phrase.start);
    const spanEnd = Math.min(line.length, Math.max(phrase.end, matchEnd));

    const highlights: ComputedHighlightSpan[] = [{
      lineIndex,
      startIndex: spanStart,
      endIndex: spanEnd,
      text: line.slice(spanStart, spanEnd),
      category: isSimile ? "SIMILE" : "METAPHOR",
      confidence: 0.65,
      explanation: isSimile
        ? "Possible simile — comparison using \"like\" (heuristic)."
        : "Possible metaphor — one thing described as another (heuristic).",
    }];

    return {
      ruleType: "METAPHOR",
      lineIndex,
      status: "PASS",
      confidence: 0.65,
      explanation: isSimile
        ? "Simile pattern detected (heuristic — not AI)."
        : "Metaphor pattern detected (heuristic — not AI).",
      highlights,
    };
  }

  // TODO Phase 5B: call AI to detect abstract metaphor
  return {
    ruleType: "METAPHOR",
    lineIndex,
    status: "NEEDS_REVIEW",
    confidence: 0,
    explanation:
      "No metaphor pattern detected — may be present but not detectable without AI.",
    highlights: [],
  };
}

// ─── Punchline ────────────────────────────────────────────────────────────────

/**
 * Very weak heuristic — punchlines are highly subjective.
 * TODO Phase 5B: AI semantic check.
 */
export function checkPunchline(line: string, lineIndex: number): RuleCheckResult {
  const lower = line.toLowerCase();
  const hasPunct = /[!?]$/.test(line.trim());
  const hasWordplay = /\b(get it|ya feel|feel me|you heard|facts|real talk|no cap|bar)\b/.test(lower);

  if (hasPunct || hasWordplay) {
    return {
      ruleType: "PUNCHLINE",
      lineIndex,
      status: "NEEDS_REVIEW",
      confidence: 0.4,
      explanation:
        "Possible punchline indicator detected — but punchlines are subjective. Humans will judge.",
      highlights: [],
    };
  }

  return {
    ruleType: "PUNCHLINE",
    lineIndex,
    status: "NEEDS_REVIEW",
    confidence: 0,
    explanation:
      "Punchlines require semantic understanding — AI check coming in Phase 5B. Humans will vote.",
    highlights: [],
  };
}

// ─── Callback ─────────────────────────────────────────────────────────────────

/**
 * Heuristic: look for shared significant words between this line and the target line.
 * TODO Phase 5B: AI semantic check.
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

  return {
    ruleType: "CALLBACK",
    lineIndex,
    status: "NEEDS_REVIEW",
    confidence: 0,
    explanation:
      "Callbacks require semantic understanding — AI check coming in Phase 5B. Humans will vote.",
    highlights: [],
  };
}

// ─── Internal rhyme ───────────────────────────────────────────────────────────

/**
 * Heuristic: find two non-adjacent words within the line that likely rhyme.
 * Uses improved slant-rhyme detection (wordsLikelyRhyme) instead of simple char matching.
 * TODO Phase 5B: AI phonetic analysis for comprehensive detection.
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

  for (let i = 0; i < words.length - 2; i++) {
    for (let j = i + 2; j < words.length; j++) {
      const result = wordsLikelyRhyme(words[i], words[j]);
      if (result.status !== "MISSING") {
        const startA = findWordStart(line, words[i]);
        const startB = findWordStart(line, words[j], startA + 1);
        const highlights: ComputedHighlightSpan[] = [];
        if (startA >= 0) {
          highlights.push({
            lineIndex,
            startIndex: startA,
            endIndex: startA + words[i].length,
            text: words[i],
            category: "INTERNAL_RHYME",
            confidence: 0.6,
            explanation: "Possible internal rhyme (heuristic).",
          });
        }
        if (startB >= 0) {
          highlights.push({
            lineIndex,
            startIndex: startB,
            endIndex: startB + words[j].length,
            text: words[j],
            category: "INTERNAL_RHYME",
            confidence: 0.6,
            explanation: "Possible internal rhyme (heuristic).",
          });
        }
        return {
          ruleType: "INTERNAL_RHYME",
          lineIndex,
          status: "NEEDS_REVIEW",
          confidence: 0.6,
          explanation: `Possible internal rhyme: "${words[i]}" / "${words[j]}" (heuristic).`,
          highlights,
        };
      }
    }
  }

  return {
    ruleType: "INTERNAL_RHYME",
    lineIndex,
    status: "NEEDS_REVIEW",
    confidence: 0,
    explanation: "Internal rhymes need phonetic analysis — AI check coming in Phase 5B.",
    highlights: [],
  };
}

// ─── Assonance ────────────────────────────────────────────────────────────────

/** TODO Phase 5B: phonetic vowel analysis. */
export function checkAssonance(line: string, lineIndex: number): RuleCheckResult {
  void line;
  return {
    ruleType: "ASSONANCE",
    lineIndex,
    status: "NEEDS_REVIEW",
    confidence: 0,
    explanation: "Assonance detection needs phonetic analysis — AI check coming in Phase 5B.",
    highlights: [],
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FILLER_WORDS = new Set([
  "that", "this", "with", "from", "they", "them", "their", "have",
  "been", "will", "would", "could", "should", "just", "like", "also",
]);

function findWordStart(line: string, word: string, fromIndex = 0): number {
  return line.toLowerCase().indexOf(word, fromIndex);
}
