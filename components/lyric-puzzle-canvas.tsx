"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";
import type { ChallengeDTO, ChallengeRuleDTO, ConstraintType } from "@/lib/types";

// ─── Color palette ────────────────────────────────────────────────────────────

type LineColor = "yellow" | "cyan" | "green" | "purple" | "pink" | "amber" | "orange" | "zinc";

const C: Record<LineColor, { chip: string; text: string; row: string; gutter: string }> = {
  yellow: { chip: "bg-yellow-400", text: "text-zinc-900", row: "bg-yellow-50",  gutter: "bg-yellow-50/70"  },
  cyan:   { chip: "bg-cyan-400",   text: "text-zinc-900", row: "bg-cyan-50",    gutter: "bg-cyan-50/70"    },
  green:  { chip: "bg-green-400",  text: "text-zinc-900", row: "bg-green-50",   gutter: "bg-green-50/70"   },
  purple: { chip: "bg-purple-500", text: "text-white",    row: "bg-purple-50",  gutter: "bg-purple-50/70"  },
  pink:   { chip: "bg-pink-400",   text: "text-zinc-900", row: "bg-pink-50",    gutter: "bg-pink-50/70"    },
  amber:  { chip: "bg-amber-400",  text: "text-zinc-900", row: "bg-amber-50",   gutter: "bg-amber-50/70"   },
  orange: { chip: "bg-orange-400", text: "text-zinc-900", row: "bg-orange-50",  gutter: "bg-orange-50/70"  },
  zinc:   { chip: "bg-zinc-400",   text: "text-white",    row: "bg-zinc-50",    gutter: "bg-zinc-50/70"    },
};

// Canonical scheme letter → color (for the summary pills row)
const LETTER_COLOR: Record<string, LineColor> = {
  A: "yellow", B: "purple", C: "cyan", D: "pink",
  E: "green",  F: "orange", X: "zinc",
};
function letterColor(l: string): LineColor {
  return LETTER_COLOR[l.toUpperCase()] ?? "zinc";
}

// ─── Rule → chip data ─────────────────────────────────────────────────────────

interface ChipData { label: string; color: LineColor; placeholder: string }

function ruleToChip(type: ConstraintType, lineIndex: number, rhymesWithLine: number | null): ChipData {
  const rw = rhymesWithLine !== null ? rhymesWithLine + 1 : null;
  switch (type) {
    case "END_RHYME":
      return rw
        ? { label: `RHYME ↔ L${rw}`,    color: "cyan",   placeholder: `End rhyming with line ${rw}…` }
        : { label: "END RHYME",           color: "cyan",   placeholder: "End on a rhyming word…" };
    case "INTERNAL_RHYME":
      return   { label: "INTERNAL RHYME", color: "cyan",   placeholder: "Slip a rhyme inside the bar itself…" };
    case "LINE_START_RHYMES_WITH_PREVIOUS_END":
      return   { label: "CHAIN RHYME",    color: "cyan",   placeholder: `Start with a word rhyming with line ${lineIndex}'s ending…` };
    case "METAPHOR":
      return   { label: "METAPHOR",        color: "green",  placeholder: "Drop a vivid metaphor or image…" };
    case "THEME_REFERENCE":
      return   { label: "THEME",           color: "green",  placeholder: "Weave the theme into this bar…" };
    case "PUNCHLINE":
      return   { label: "PUNCHLINE",       color: "purple", placeholder: "Land the punchline — make it hit…" };
    case "CALLBACK":
      return   { label: "CALLBACK",        color: "pink",   placeholder: "Echo something from earlier in the verse…" };
    case "ALLITERATION":
      return   { label: "ALLITERATION",    color: "amber",  placeholder: "Repeat the same starting sounds…" };
    case "ASSONANCE":
      return   { label: "ASSONANCE",       color: "cyan",   placeholder: "Let vowel sounds echo across the line…" };
    case "REQUIRED_WORD":
      return   { label: "USE REQ. WORDS",  color: "amber",  placeholder: "Weave the required words in here…" };
    default:
      return   { label: "WRITE",           color: "zinc",   placeholder: `Bar ${lineIndex + 1}…` };
  }
}

// ─── Scheme derivation ────────────────────────────────────────────────────────

function deriveScheme(barCount: number, rules: ChallengeRuleDTO[]): string[] {
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

// ─── Per-line metadata ────────────────────────────────────────────────────────

interface LineMeta {
  lineIndex: number;
  schemeLetter: string;
  chip: ChipData;
  rhymesWithLine: number | null;
}

const RULE_PRI: Partial<Record<ConstraintType, number>> = {
  PUNCHLINE: 10, CALLBACK: 9, METAPHOR: 8, THEME_REFERENCE: 7,
  INTERNAL_RHYME: 6, END_RHYME: 5, LINE_START_RHYMES_WITH_PREVIOUS_END: 4,
  ALLITERATION: 3, ASSONANCE: 2, REQUIRED_WORD: 1,
};

function buildMeta(challenge: ChallengeDTO): LineMeta[] {
  const { barCount, rules } = challenge;
  const scheme = deriveScheme(barCount, rules);

  // Best explicit rule per line (RHYME_SCHEME excluded — handled by scheme)
  const byLine = new Map<number, ChallengeRuleDTO>();
  for (const rule of rules) {
    if (rule.lineIndex === null || rule.type === "RHYME_SCHEME") continue;
    const existing = byLine.get(rule.lineIndex);
    const pri = RULE_PRI[rule.type] ?? 0;
    if (!existing || pri > (RULE_PRI[existing.type] ?? 0)) byLine.set(rule.lineIndex, rule);
  }

  // First occurrence of each scheme letter
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
      };
    } else {
      chip = { label: "SETUP RHYME", color: "yellow", placeholder: "Set up your rhyme — drop the first line…" };
    }

    return { lineIndex: i, schemeLetter: letter, chip, rhymesWithLine };
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

interface LyricPuzzleCanvasProps {
  challenge: ChallengeDTO;
  lines: string[];
  onLineChange: (index: number, value: string) => void;
  disabled?: boolean;
}

export function LyricPuzzleCanvas({
  challenge,
  lines,
  onLineChange,
  disabled = false,
}: LyricPuzzleCanvasProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const meta = buildMeta(challenge);
  const scheme = meta.map((m) => m.schemeLetter);
  const filledCount = lines.filter((l) => l.trim().length > 0).length;
  const allFilled = filledCount === challenge.barCount && lines.every((l) => l.trim().length > 0);

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && i < challenge.barCount - 1) {
      e.preventDefault();
      inputRefs.current[i + 1]?.focus();
    }
    if (e.key === "Backspace" && (lines[i] ?? "") === "" && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
  }

  return (
    <div>
      {/* Scheme summary pills */}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mr-0.5">
          Scheme:
        </span>
        {scheme.map((letter, i) => {
          const col = C[letterColor(letter)];
          return (
            <span
              key={i}
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0",
                col.chip, col.text,
              )}
            >
              {letter}
            </span>
          );
        })}
      </div>

      {/* Required words */}
      {challenge.requiredWords.length > 0 && (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Required:
          </span>
          {challenge.requiredWords.map((rw) => (
            <span
              key={rw.id}
              className="text-xs font-mono font-black uppercase tracking-wide text-amber-900 bg-amber-300 border border-amber-400/60 px-2.5 py-0.5 rounded-full"
            >
              {rw.word}
            </span>
          ))}
        </div>
      )}

      {/* Canvas */}
      <div
        className={cn(
          "bg-white rounded-2xl overflow-hidden shadow-2xl border-2 transition-colors duration-300",
          disabled ? "opacity-60 border-transparent"
            : allFilled ? "border-green-400/40"
            : "border-transparent",
        )}
      >
        {meta.map((m, i) => {
          const value = lines[i] ?? "";
          const isEmpty = value.trim().length === 0;
          const col = C[m.chip.color];

          return (
            <div
              key={i}
              className={cn(
                "flex items-stretch border-b border-zinc-100/80 last:border-b-0 transition-colors duration-150",
                isEmpty ? col.row : "bg-white",
              )}
            >
              {/* Gutter: line number + scheme badge */}
              <div
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-3 border-r border-zinc-100 flex-shrink-0 select-none transition-colors duration-150",
                  isEmpty ? col.gutter : "bg-zinc-50/50",
                )}
                style={{ width: "44px" }}
                aria-hidden
              >
                <span className="text-xs font-black text-zinc-400 leading-none tabular-nums">
                  {i + 1}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-black rounded px-1 py-0.5 leading-none transition-colors duration-150",
                    isEmpty ? `${col.chip} ${col.text}` : "bg-zinc-200 text-zinc-500",
                  )}
                >
                  {m.schemeLetter}
                </span>
              </div>

              {/* Content: chip + input */}
              <div className="flex-1 flex flex-col justify-center gap-1 px-3 py-2.5 min-w-0">
                {/* Rule chip + rhyme connector */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={cn(
                      "text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full flex-shrink-0 leading-none",
                      col.chip, col.text,
                    )}
                  >
                    {m.chip.label}
                  </span>
                  {m.rhymesWithLine !== null && (
                    <span className="text-[10px] text-zinc-400 font-mono font-semibold leading-none">
                      ↔ line {m.rhymesWithLine + 1}
                    </span>
                  )}
                </div>

                {/* Text input */}
                <input
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  value={value}
                  onChange={(e) => onLineChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  disabled={disabled}
                  placeholder={isEmpty ? m.chip.placeholder : ""}
                  className={cn(
                    "w-full bg-transparent text-zinc-900 text-sm font-normal",
                    "placeholder-zinc-400 outline-none leading-snug",
                    disabled && "cursor-not-allowed",
                  )}
                  autoCapitalize="sentences"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>
            </div>
          );
        })}

        {/* Footer: progress dots */}
        <div className="border-t border-zinc-100 bg-zinc-50 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-1">
            {Array.from({ length: challenge.barCount }, (_, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-full transition-all duration-200",
                  i < filledCount ? "w-2 h-2 bg-violet-500" : "w-1.5 h-1.5 bg-zinc-300",
                )}
              />
            ))}
          </div>
          <span className={cn("text-xs", allFilled ? "text-green-600 font-semibold" : "text-zinc-500")}>
            {allFilled ? "✓ All bars written" : `${filledCount} / ${challenge.barCount} bars`}
          </span>
        </div>
      </div>
    </div>
  );
}
