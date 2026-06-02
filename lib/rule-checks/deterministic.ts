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

/** Find the end word in `line` and return its character range. */
function endWordRange(line: string): { start: number; end: number } | null {
  const trimmed = line.trimEnd();
  const m = trimmed.match(/[a-zA-Z']+$/);
  if (!m || m.index === undefined) return null;
  return { start: m.index, end: m.index + m[0].length };
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

// ─── Rhyme detection ──────────────────────────────────────────────────────────

function normalizeWord(w: string): string {
  return w.toLowerCase().replace(/[^a-z]/g, "");
}

/**
 * Strip trailing silent 'e' so rhyme keys are phoneme-based rather than spelling-based.
 * "home"→"hom", "time"→"tim", "stone"→"ston". Only strips when there are other vowels.
 */
function stripSilentE(w: string): string {
  if (w.length > 3 && /[^aeiou]e$/.test(w) && /[aeiou]/.test(w.slice(0, -2))) {
    return w.slice(0, -1);
  }
  return w;
}

/**
 * Returns the rhyme key: the portion of the word from the last vowel-cluster to the end.
 * Examples: "night"→"ight", "window"→"ow", "tempo"→"o", "station"→"ation", "home"→"om".
 */
function getRhymeKey(w: string): string {
  const norm = stripSilentE(normalizeWord(w));
  const m = norm.match(/[aeiou][^aeiou]*$/);
  return m ? m[0] : norm.slice(-2);
}

/**
 * Maps rhyme keys to broad vowel-sound groups for slant rhyme detection.
 * Returns an uppercase group tag, or the original key if no group matches.
 */
function getPhonemeGroup(key: string): string {
  const k = key;
  // "OH" sound: o, ow, oe, oa, old, ome, on, etc.
  if (/^o[^aeiou]*$/.test(k) || k === "ow" || k === "oe" || k === "oa") return "OH";
  // "AY" sound: ay, ai, ei, a+consonants (late, make, rain)
  if (/^a[^aeiou]+$/.test(k) || k === "ay" || k === "ai" || k === "ei") return "AY";
  // "EE" sound: ee, ea, ie, ey, e alone
  if (/^(ee|ea|ie|ey|e)$/.test(k)) return "EE";
  // "EYE" sound: ight, ite, ine, ike, i+consonants
  if (/^(igh|ight|ite|ine|ike|ile|ive)$/.test(k) || /^i[^aeiou]+$/.test(k)) return "EYE";
  // "OO" sound: oo, ue, ew, oom, oon, ool, u+consonants
  if (/^(oo|ue|ew|oom|oon|ool|oot)$/.test(k) || /^u[^aeiou]+$/.test(k)) return "OO";
  // "ER" sound: er, ir, ur, ure
  if (/^(er|ir|ur|ure)$/.test(k) || k.endsWith("er") || k.endsWith("ir")) return "ER";
  // "AW" sound: aw, au
  if (/^(aw|au|aught|ought)$/.test(k)) return "AW";
  return k; // no group — return key as-is
}

export type RhymeResult = { status: "PASS" | "NEEDS_REVIEW" | "MISSING"; explanation: string };

/**
 * Determines whether two words are likely to rhyme, with slant-rhyme support.
 *
 * Level 1 — exact rhyme key: "night"/"fight" → PASS
 * Level 1.5 — deduplicated key (handles "e"/"ee", "o"/"oo"): PASS
 * Level 2 — same phoneme group: "window"/"tempo" (both OH) → NEEDS_REVIEW
 * Level 3 — same last 2 chars of word: NEEDS_REVIEW
 * Else → MISSING
 */
export function wordsLikelyRhyme(a: string, b: string): RhymeResult {
  const wa = normalizeWord(a);
  const wb = normalizeWord(b);
  if (!wa || !wb) return { status: "MISSING", explanation: "empty word" };
  if (wa === wb) return { status: "MISSING", explanation: "same word" };

  const keyA = getRhymeKey(wa);
  const keyB = getRhymeKey(wb);

  // Level 1: exact rhyme key (min 1 char — single-vowel endings like "me/free" → "e" are valid)
  if (keyA === keyB && keyA.length >= 1) {
    return { status: "PASS", explanation: `"${a}" / "${b}" rhyme on "-${keyA}"` };
  }

  // Level 1.5: deduplicated consecutive chars (handles "o"/"oo", "e"/"ee")
  const dedup = (s: string) => s.replace(/(.)\1+/g, "$1");
  const dkA = dedup(keyA), dkB = dedup(keyB);
  if (dkA === dkB && dkA.length >= 1) {
    return { status: "PASS", explanation: `"${a}" / "${b}" — near-exact rhyme` };
  }

  // Level 2: same phoneme group (slant/vowel rhyme)
  const groupA = getPhonemeGroup(keyA);
  const groupB = getPhonemeGroup(keyB);
  if (groupA === groupB) {
    return {
      status: "NEEDS_REVIEW",
      explanation: `"${a}" / "${b}" — possible slant rhyme (similar vowel sound)`,
    };
  }

  // Level 3: same last 2 chars of the normalized word
  if (wa.length >= 4 && wb.length >= 4 && wa.slice(-2) === wb.slice(-2)) {
    return { status: "NEEDS_REVIEW", explanation: `"${a}" / "${b}" — near rhyme (same ending)` };
  }

  return { status: "MISSING", explanation: `"${a}" / "${b}" — no rhyme detected` };
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
 * Highlights each found occurrence with REQUIRED_WORD category (inline, word-precise).
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
 * Highlights each alliterating word individually (not the whole line).
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
      explanation: `Alliterating word starting with '${bestLetter.toUpperCase()}'.`,
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
 * Checks that two lines end-rhyme (supports exact rhyme → PASS, slant → NEEDS_REVIEW).
 * Always highlights the end word of both lines when they have content.
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

  // Always highlight end words (they are the relevant spans regardless of rhyme quality)
  const highlights: ComputedHighlightSpan[] = [];
  const rangeA = endWordRange(textA);
  const rangeB = endWordRange(textB);

  if (rangeA) {
    highlights.push({
      lineIndex: lineA,
      startIndex: rangeA.start,
      endIndex: rangeA.end,
      text: textA.slice(rangeA.start, rangeA.end),
      category: "END_RHYME",
      confidence: 0.8,
      explanation: `End word — rhyme pair with line ${lineB + 1}.`,
    });
  }
  if (rangeB) {
    highlights.push({
      lineIndex: lineB,
      startIndex: rangeB.start,
      endIndex: rangeB.end,
      text: textB.slice(rangeB.start, rangeB.end),
      category: "END_RHYME",
      confidence: 0.8,
      explanation: `End word — rhyme pair with line ${lineA + 1}.`,
    });
  }

  if (!wordA || !wordB) {
    return {
      ruleType: "END_RHYME",
      lineIndex: lineA,
      status: "NEEDS_REVIEW",
      confidence: 0.3,
      explanation: "One or both lines are empty — rhyme cannot be checked.",
      highlights,
    };
  }

  const rhyme = wordsLikelyRhyme(wordA, wordB);
  const confidence = rhyme.status === "PASS" ? 0.85 : rhyme.status === "NEEDS_REVIEW" ? 0.6 : 0.3;

  // Update highlight confidence to match rhyme quality
  for (const h of highlights) h.confidence = confidence;

  return {
    ruleType: "END_RHYME",
    lineIndex: lineA,
    status: rhyme.status,
    confidence,
    explanation: rhyme.explanation,
    highlights,
  };
}

// ─── Rhyme scheme ─────────────────────────────────────────────────────────────

/**
 * Processes a full rhyme scheme: groups lines by letter, runs a rhyme-pair
 * check for every consecutive pair within each group.
 */
export function checkRhymeScheme(
  lines: string[],
  scheme: string[],
): RuleCheckResult[] {
  const groups = new Map<string, number[]>();
  scheme.forEach((letter, i) => {
    if (!groups.has(letter)) groups.set(letter, []);
    groups.get(letter)!.push(i);
  });

  const results: RuleCheckResult[] = [];
  for (const [, indices] of groups) {
    if (indices.length < 2) continue;
    for (let p = 0; p < indices.length - 1; p++) {
      results.push(checkEndRhymePair(lines, indices[p], indices[p + 1]));
    }
  }
  return results;
}

// ─── Chain rhyme ──────────────────────────────────────────────────────────────

/**
 * LINE_START_RHYMES_WITH_PREVIOUS_END: first word of line N should rhyme with
 * the last word of line N-1. Uses improved slant-rhyme detection.
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
  const rhyme = wordsLikelyRhyme(prevEnd, thisStart);

  const highlights: ComputedHighlightSpan[] = [];
  if (thisStart) {
    highlights.push({
      lineIndex,
      startIndex: 0,
      endIndex: thisStart.length,
      text: thisLine.slice(0, thisStart.length),
      category: "END_RHYME",
      confidence: rhyme.status === "PASS" ? 0.85 : 0.5,
      explanation: `Start word — chain rhyme with end of line ${lineIndex}.`,
    });
  }

  return {
    ruleType: "LINE_START_RHYMES_WITH_PREVIOUS_END",
    lineIndex,
    status: rhyme.status,
    confidence: rhyme.status === "PASS" ? 0.85 : 0.5,
    explanation: rhyme.explanation,
    highlights,
  };
}

// ─── Theme reference ──────────────────────────────────────────────────────────

/**
 * Keyword search: if the theme word (or a root of it) appears in the line, PASS.
 * Highlights the matched theme word inline.
 */
export function checkThemeReference(
  line: string,
  lineIndex: number,
  theme: string,
): RuleCheckResult {
  const lower = line.toLowerCase();
  const stem = theme.toLowerCase().slice(0, 5);
  const idx = lower.indexOf(theme.toLowerCase());
  const stemIdx = idx === -1 ? lower.indexOf(stem) : -1;
  const found = idx !== -1 || stemIdx !== -1;

  const highlights: ComputedHighlightSpan[] = [];
  if (found) {
    const start = idx !== -1 ? idx : stemIdx;
    const matchText = idx !== -1 ? theme : stem;
    highlights.push({
      lineIndex,
      startIndex: start,
      endIndex: start + matchText.length,
      text: line.slice(start, start + matchText.length),
      category: "METAPHOR",
      confidence: 0.7,
      explanation: `Theme reference to "${theme}" detected.`,
    });
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
