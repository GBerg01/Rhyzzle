/**
 * Deterministic and lightweight-heuristic rule checks.
 * No AI or external APIs. Every result here is either certain (confidence 1.0)
 * or clearly labeled as a heuristic.
 */

import type { RequiredWordDTO } from "@/lib/types";
import type { RuleCheckResult, ComputedHighlightSpan } from "./types";

// ─── Text helpers ─────────────────────────────────────────────────────────────

/** Last meaningful word of a line, stripped of punctuation. */
function endWord(line: string): string {
  const words = line.trim().match(/[a-zA-Z']+/g) ?? [];
  return (words[words.length - 1] ?? "").toLowerCase().replace(/[^a-z]/g, "");
}

/**
 * Very simple rhyme heuristic: share the same vowel nucleus + coda.
 * Handles "cat/bat", "night/light", "day/say", "nation/station".
 * NOT reliable for slant rhymes or multisyllabic rhymes — those need AI.
 */
function simpleRhymes(a: string, b: string): boolean {
  if (!a || !b || a === b) return false;
  const nucleus = (w: string) => {
    const v = w.search(/[aeiou]/);
    return v === -1 ? w.slice(-2) : w.slice(v);
  };
  const na = nucleus(a), nb = nucleus(b);
  return na.length >= 2 && nb.length >= 2 && na === nb;
}

/** Find all character ranges in `line` where `word` appears (case-insensitive, whole-word). */
function findWordRanges(line: string, word: string): { start: number; end: number }[] {
  const ranges: { start: number; end: number }[] = [];
  const re = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    ranges.push({ start: m.index, end: m.index + m[0].length });
  }
  return ranges;
}

/** Find the end word in `line` and return its character range. */
function endWordRange(line: string): { start: number; end: number } | null {
  const trimmed = line.trimEnd();
  const m = trimmed.match(/[a-zA-Z']+$/);
  if (!m || !m.index) return null;
  const start = m.index;
  return { start, end: start + m[0].length };
}

// ─── Line count ───────────────────────────────────────────────────────────────

export function checkLineCount(lines: string[], barCount: number): RuleCheckResult {
  const filled = lines.filter((l) => l.trim().length > 0).length;
  const pass = lines.length === barCount && filled === barCount;
  return {
    ruleType: "LINE_COUNT",
    lineIndex: null,
    status: pass ? "PASS" : "MISSING",
    confidence: 1.0,
    explanation: pass
      ? `All ${barCount} bars filled.`
      : `Expected ${barCount} bars, found ${filled} non-empty.`,
    highlights: [],
  };
}

// ─── Required words ───────────────────────────────────────────────────────────

/**
 * Checks that every required word appears somewhere in the submission.
 * Returns one combined result: PASS if all found, MISSING if any absent.
 * Highlights each found occurrence with REQUIRED_WORD category.
 */
export function checkRequiredWords(
  lines: string[],
  requiredWords: RequiredWordDTO[],
): RuleCheckResult {
  if (requiredWords.length === 0) {
    return {
      ruleType: "REQUIRED_WORD",
      lineIndex: null,
      status: "PASS",
      confidence: 1.0,
      explanation: "No required words for this challenge.",
      highlights: [],
    };
  }

  const missing: string[] = [];
  const highlights: ComputedHighlightSpan[] = [];

  for (const req of requiredWords) {
    let found = false;
    for (let i = 0; i < lines.length; i++) {
      const ranges = findWordRanges(lines[i], req.word);
      if (ranges.length > 0) {
        found = true;
        for (const r of ranges) {
          highlights.push({
            lineIndex: i,
            startIndex: r.start,
            endIndex: r.end,
            text: lines[i].slice(r.start, r.end),
            category: "REQUIRED_WORD",
            confidence: 1.0,
            explanation: `Required word "${req.word}" found.`,
          });
        }
      }
    }
    if (!found) missing.push(req.word);
  }

  const allFound = missing.length === 0;
  return {
    ruleType: "REQUIRED_WORD",
    lineIndex: null,
    status: allFound ? "PASS" : "MISSING",
    confidence: 1.0,
    explanation: allFound
      ? `All required words found: ${requiredWords.map((w) => w.word).join(", ")}.`
      : `Missing required word${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}.`,
    highlights,
  };
}

// ─── Alliteration ─────────────────────────────────────────────────────────────

/**
 * Heuristic: 2+ content words (length > 2) starting with the same letter.
 * Not AI — purely character-based. Labels itself as heuristic in result.
 */
export function checkAlliteration(line: string, lineIndex: number): RuleCheckResult {
  const words = line.match(/\b[a-zA-Z]{3,}\b/g) ?? [];

  const byLetter: Record<string, { word: string; rawStart: number }[]> = {};
  let searchPos = 0;
  for (const w of words) {
    const pos = line.indexOf(w, searchPos);
    const letter = w[0].toLowerCase();
    if (!byLetter[letter]) byLetter[letter] = [];
    byLetter[letter].push({ word: w, rawStart: pos });
    searchPos = pos + 1;
  }

  // Find the letter with the most alliterating words
  let bestLetter = "";
  let bestGroup: { word: string; rawStart: number }[] = [];
  for (const [letter, group] of Object.entries(byLetter)) {
    if (group.length > bestGroup.length) { bestLetter = letter; bestGroup = group; }
  }

  if (bestGroup.length >= 2) {
    const highlights: ComputedHighlightSpan[] = bestGroup.map((entry) => ({
      lineIndex,
      startIndex: entry.rawStart,
      endIndex: entry.rawStart + entry.word.length,
      text: entry.word,
      category: "ALLITERATION" as const,
      confidence: 0.85,
      explanation: `Alliterating words starting with '${bestLetter.toUpperCase()}'.`,
    }));
    return {
      ruleType: "ALLITERATION",
      lineIndex,
      status: "PASS",
      confidence: 0.85,
      explanation: `${bestGroup.length} words starting with '${bestLetter.toUpperCase()}' detected (heuristic).`,
      highlights,
    };
  }

  return {
    ruleType: "ALLITERATION",
    lineIndex,
    status: "NEEDS_REVIEW",
    confidence: 0.7,
    explanation: "Could not detect clear alliteration. Review the line.",
    highlights: [],
  };
}

// ─── End-rhyme pair ───────────────────────────────────────────────────────────

/**
 * Checks that two lines end-rhyme with each other (heuristic vowel-nucleus matching).
 * Always highlights the end word of both lines with END_RHYME category.
 */
export function checkEndRhymePair(
  lines: string[],
  lineA: number,
  lineB: number,
): RuleCheckResult {
  const textA = lines[lineA] ?? "";
  const textB = lines[lineB] ?? "";
  const wordA = endWord(textA);
  const wordB = endWord(textB);

  const highlights: ComputedHighlightSpan[] = [];
  const rangeA = endWordRange(textA);
  const rangeB = endWordRange(textB);

  if (rangeA) {
    highlights.push({
      lineIndex: lineA, startIndex: rangeA.start, endIndex: rangeA.end,
      text: textA.slice(rangeA.start, rangeA.end),
      category: "END_RHYME", confidence: 0.8,
      explanation: `End word rhyming with line ${lineB + 1}.`,
    });
  }
  if (rangeB) {
    highlights.push({
      lineIndex: lineB, startIndex: rangeB.start, endIndex: rangeB.end,
      text: textB.slice(rangeB.start, rangeB.end),
      category: "END_RHYME", confidence: 0.8,
      explanation: `End word rhyming with line ${lineA + 1}.`,
    });
  }

  const rhymes = simpleRhymes(wordA, wordB);
  return {
    ruleType: "END_RHYME",
    lineIndex: lineA,
    status: rhymes ? "PASS" : "NEEDS_REVIEW",
    confidence: rhymes ? 0.8 : 0.5,
    explanation: rhymes
      ? `"${wordA}" / "${wordB}" detected as a rhyme pair (heuristic).`
      : `End words "${wordA}" / "${wordB}" — rhyme quality needs review.`,
    highlights,
  };
}

// ─── Rhyme scheme ─────────────────────────────────────────────────────────────

/**
 * Processes a full rhyme scheme: groups lines by letter, runs a rhyme-pair
 * check for every consecutive pair within each group, and highlights end words.
 * Returns one result per group.
 */
export function checkRhymeScheme(
  lines: string[],
  scheme: string[],
): RuleCheckResult[] {
  // Group line indices by scheme letter
  const groups = new Map<string, number[]>();
  scheme.forEach((letter, i) => {
    if (!groups.has(letter)) groups.set(letter, []);
    groups.get(letter)!.push(i);
  });

  const results: RuleCheckResult[] = [];

  for (const [, indices] of groups) {
    if (indices.length < 2) continue; // singleton — no rhyme check needed

    // Check consecutive pairs (AA, AB in ABAB, etc.)
    for (let p = 0; p < indices.length - 1; p++) {
      const a = indices[p], b = indices[p + 1];
      results.push(checkEndRhymePair(lines, a, b));
    }
  }

  return results;
}

// ─── Chain rhyme ──────────────────────────────────────────────────────────────

/**
 * LINE_START_RHYMES_WITH_PREVIOUS_END: first word of line N should rhyme with
 * the last word of line N-1.
 */
export function checkChainRhyme(lines: string[], lineIndex: number): RuleCheckResult {
  if (lineIndex === 0) {
    return {
      ruleType: "LINE_START_RHYMES_WITH_PREVIOUS_END",
      lineIndex,
      status: "NEEDS_REVIEW",
      confidence: 0.5,
      explanation: "Cannot check chain rhyme on the first line.",
      highlights: [],
    };
  }

  const prevLine = lines[lineIndex - 1] ?? "";
  const thisLine = lines[lineIndex] ?? "";
  const prevEnd = endWord(prevLine);
  const thisStart = (thisLine.match(/^[a-zA-Z']+/) ?? [""])[0].toLowerCase().replace(/[^a-z]/g, "");
  const rhymes = simpleRhymes(prevEnd, thisStart);

  const highlights: ComputedHighlightSpan[] = [];
  if (thisStart) {
    highlights.push({
      lineIndex,
      startIndex: 0,
      endIndex: thisStart.length,
      text: thisLine.slice(0, thisStart.length),
      category: "END_RHYME",
      confidence: rhymes ? 0.8 : 0.5,
      explanation: `Start word, should rhyme with "${prevEnd}" from line ${lineIndex}.`,
    });
  }

  return {
    ruleType: "LINE_START_RHYMES_WITH_PREVIOUS_END",
    lineIndex,
    status: rhymes ? "PASS" : "NEEDS_REVIEW",
    confidence: rhymes ? 0.8 : 0.5,
    explanation: rhymes
      ? `"${thisStart}" / "${prevEnd}" detected as chain rhyme (heuristic).`
      : `Start word "${thisStart}" / end word "${prevEnd}" — chain rhyme needs review.`,
    highlights,
  };
}

// ─── Theme reference ──────────────────────────────────────────────────────────

/**
 * Simple keyword search: if the theme word (or a root of it) appears in the line,
 * PASS. Otherwise NEEDS_REVIEW — theme can be expressed many ways.
 */
export function checkThemeReference(
  line: string,
  lineIndex: number,
  theme: string,
): RuleCheckResult {
  const lower = line.toLowerCase();
  // Check theme word and simple root (first 5 chars as stem)
  const stem = theme.toLowerCase().slice(0, 5);
  const found = lower.includes(theme.toLowerCase()) || lower.includes(stem);

  const highlights: ComputedHighlightSpan[] = [];
  if (found) {
    const idx = lower.indexOf(theme.toLowerCase());
    if (idx !== -1) {
      highlights.push({
        lineIndex,
        startIndex: idx,
        endIndex: idx + theme.length,
        text: line.slice(idx, idx + theme.length),
        category: "METAPHOR", // closest semantic category
        confidence: 0.7,
        explanation: `Theme reference to "${theme}" detected.`,
      });
    }
  }

  return {
    ruleType: "THEME_REFERENCE",
    lineIndex,
    status: found ? "PASS" : "NEEDS_REVIEW",
    confidence: found ? 0.7 : 0.4,
    explanation: found
      ? `Theme "${theme}" referenced (keyword match).`
      : `Theme "${theme}" not detected — may be expressed indirectly.`,
    highlights,
  };
}
