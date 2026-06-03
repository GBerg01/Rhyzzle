"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { ChallengeDTO, HighlightCategory } from "@/lib/types";
import type { RuleHelpKey } from "@/lib/rule-help";
import { RuleHelpSheet } from "@/components/rule-help-sheet";
import { buildMeta, C, letterColor, getLineAllChips, type LineColor } from "@/lib/lyric-meta";
import { runLiveChecks, type LiveCheckState } from "@/lib/rule-checks/live-checks";
import { getLiveHighlightSpans } from "@/lib/rule-checks/live-highlights";
import type { ComputedHighlightSpan } from "@/lib/rule-checks/types";

// ─── Focus indicator — 3px colored left strip when a row is active ────────────

const FOCUS_STRIP: Record<LineColor, string> = {
  yellow: "bg-yellow-400",
  cyan:   "bg-cyan-400",
  green:  "bg-green-400",
  purple: "bg-purple-500",
  pink:   "bg-pink-400",
  amber:  "bg-amber-400",
  orange: "bg-orange-400",
  zinc:   "bg-zinc-400",
};

// Canvas card border tracks the focused line's color
const CANVAS_BORDER_FOCUSED: Record<LineColor, string> = {
  yellow: "border-yellow-300/60",
  cyan:   "border-cyan-300/60",
  green:  "border-green-300/60",
  purple: "border-purple-300/60",
  pink:   "border-pink-300/60",
  amber:  "border-amber-300/60",
  orange: "border-orange-300/60",
  zinc:   "border-zinc-300/60",
};

// Caret color to use when input text is transparent (hex value matching col.textDark)
const CARET_COLOR: Record<LineColor, string> = {
  yellow: "#451a03", // amber-950
  cyan:   "#083344", // cyan-950
  green:  "#052e16", // green-950
  purple: "#2e1065", // purple-950
  pink:   "#500724", // pink-950
  amber:  "#451a03", // amber-950
  orange: "#431407", // orange-950
  zinc:   "#3f3f46", // zinc-700
};

// ─── Overlay highlight colors ──────────────────────────────────────────────────
// Background-only (no padding) so character positions stay aligned with the input.
// Uses RGB arrays so we can vary alpha by confidence level.

type RGB = [number, number, number];

const LIVE_HL_RGB: Partial<Record<HighlightCategory, RGB>> = {
  END_RHYME:      [147, 197, 253], // blue-300
  INTERNAL_RHYME: [103, 232, 249], // cyan-300
  ALLITERATION:   [253, 186, 116], // orange-300
  METAPHOR:       [134, 239, 172], // green-300
  SIMILE:         [94,  234, 212], // teal-300
  REQUIRED_WORD:  [252, 211,  77], // amber-300
  PUNCHLINE:      [196, 181, 253], // purple-300
  CALLBACK:       [249, 168, 212], // pink-300
};

function hlBg(category: HighlightCategory, confidence: number): string | undefined {
  const rgb = LIVE_HL_RGB[category];
  if (!rgb) return undefined;
  // High confidence (exact rhyme, deterministic): strong alpha
  // Lower confidence (slant rhyme, heuristic): softer alpha
  const alpha = confidence >= 0.8 ? 0.78 : 0.45;
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
}

// ─── Inline overlay text renderer ─────────────────────────────────────────────
// Renders text with colored background spans behind the characters.
// No horizontal padding — alignment must stay exact.

interface LiveHighlightTextProps {
  text: string;
  spans: ComputedHighlightSpan[];
  textClass: string; // col.textDark class — colors non-highlighted text
}

function LiveHighlightText({ text, spans, textClass }: LiveHighlightTextProps) {
  if (!text) return null;

  const valid = [...spans]
    .filter((s) => s.startIndex >= 0 && s.endIndex <= text.length && s.startIndex < s.endIndex)
    .sort((a, b) => a.startIndex - b.startIndex);

  if (!valid.length) {
    return <span className={textClass}>{text}</span>;
  }

  const segs: { text: string; category?: HighlightCategory; confidence?: number }[] = [];
  let pos = 0;
  for (const s of valid) {
    if (s.startIndex < pos) continue; // skip overlapping
    if (s.startIndex > pos) segs.push({ text: text.slice(pos, s.startIndex) });
    segs.push({ text: text.slice(s.startIndex, s.endIndex), category: s.category, confidence: s.confidence });
    pos = s.endIndex;
  }
  if (pos < text.length) segs.push({ text: text.slice(pos) });

  return (
    <span className={textClass}>
      {segs.map((seg, i) => {
        const bg = seg.category ? hlBg(seg.category, seg.confidence ?? 1) : undefined;
        if (!bg) return <span key={i}>{seg.text}</span>;
        return (
          <span
            key={i}
            style={{ backgroundColor: bg, borderRadius: "2px" }}
          >
            {seg.text}
          </span>
        );
      })}
    </span>
  );
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
  const overlayRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeHelpKey, setActiveHelpKey] = useState<RuleHelpKey | null>(null);
  const [focusedLine, setFocusedLine] = useState<number | null>(null);

  // Live check state (hints) + live highlight spans — both debounced 300ms
  const [liveState, setLiveState] = useState<LiveCheckState>(() =>
    runLiveChecks(lines, challenge),
  );
  const [liveSpans, setLiveSpans] = useState<ComputedHighlightSpan[][]>(() =>
    getLiveHighlightSpans(lines, challenge),
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setLiveState(runLiveChecks(lines, challenge));
      setLiveSpans(getLiveHighlightSpans(lines, challenge));
    }, 300);
    return () => clearTimeout(timer);
  // challenge is stable for the lifetime of a writing session
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines]);

  const meta = buildMeta(challenge);
  const scheme = meta.map((m) => m.schemeLetter);
  const allLineChips = meta.map((_, i) => getLineAllChips(i, challenge, scheme));
  const filledCount = lines.filter((l) => l.trim().length > 0).length;
  const allFilled = filledCount === challenge.barCount && lines.every((l) => l.trim().length > 0);

  const focusedColor = focusedLine !== null ? meta[focusedLine]?.chip.color : null;

  function syncOverlayScroll(i: number, scrollLeft: number) {
    const overlay = overlayRefs.current[i];
    if (overlay) overlay.scrollLeft = scrollLeft;
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && i < challenge.barCount - 1) {
      e.preventDefault();
      inputRefs.current[i + 1]?.focus();
    }
    if (e.key === "Backspace" && (lines[i] ?? "") === "" && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
  }

  function openHelp(helpKey: RuleHelpKey, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setActiveHelpKey(helpKey);
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

      {/* Required words — live found/missing state */}
      {challenge.requiredWords.length > 0 && (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Required:
          </span>
          {liveState.requiredWords.map((rw) => (
            <button
              key={rw.word}
              type="button"
              onClick={(e) => openHelp("REQUIRED_WORD", e)}
              title="Tap for help"
              className={cn(
                "text-xs font-mono font-black uppercase tracking-wide px-2.5 py-0.5 rounded-full",
                "border active:scale-95 transition-all duration-200 cursor-pointer",
                rw.found
                  ? "text-green-800 bg-green-100 border-green-300"
                  : "text-amber-900 bg-amber-300 border-amber-400/60",
              )}
            >
              {rw.found ? `${rw.word} ✓` : rw.word}
            </button>
          ))}
        </div>
      )}

      {/* Canvas card — border follows focused line color */}
      <div
        className={cn(
          "bg-white rounded-2xl overflow-hidden shadow-2xl border-2 transition-colors duration-200",
          disabled
            ? "opacity-60 border-transparent"
            : allFilled
            ? "border-green-400/40"
            : focusedColor
            ? CANVAS_BORDER_FOCUSED[focusedColor]
            : "border-transparent",
        )}
      >
        {meta.map((m, i) => {
          const value = lines[i] ?? "";
          const isFocused = focusedLine === i;
          const col = C[m.chip.color];
          const hint = liveState.lineHints[i];
          const chips = allLineChips[i];
          const lineSpans = liveSpans[i] ?? [];
          const hasSpans = lineSpans.length > 0 && !disabled;

          return (
            <div
              key={i}
              className={cn(
                "flex items-stretch border-b border-zinc-100/80 last:border-b-0 transition-colors duration-150 relative",
                isFocused ? col.rowFocused : col.row,
              )}
            >
              {/* Colored focus strip */}
              {isFocused && (
                <div
                  className={cn(
                    "absolute left-0 top-0 bottom-0 w-[3px] z-10",
                    FOCUS_STRIP[m.chip.color],
                  )}
                  aria-hidden
                />
              )}

              {/* Gutter: line number + scheme badge */}
              <div
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-3 border-r border-zinc-100/60 flex-shrink-0 select-none transition-colors duration-150",
                  isFocused ? col.gutterFocused : col.gutter,
                )}
                style={{ width: "44px" }}
                aria-hidden
              >
                <span className="text-xs font-black text-zinc-500 leading-none tabular-nums">
                  {i + 1}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-black rounded px-1 py-0.5 leading-none",
                    col.chip, col.text,
                  )}
                >
                  {m.schemeLetter}
                </span>
              </div>

              {/* Content: chips + overlay input + hints */}
              <div className="flex-1 flex flex-col justify-center gap-1 px-3 py-2.5 min-w-0">
                {/* Rule chip row */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {chips.map((chip, cidx) => {
                    const chipCol = C[chip.color];
                    const isPrimary = chip.priority === "primary";
                    return (
                      <button
                        key={chip.key}
                        type="button"
                        onClick={(e) => openHelp(chip.helpKey, e)}
                        className={cn(
                          "font-black uppercase tracking-wide px-2 py-0.5 rounded-full flex-shrink-0 leading-none",
                          "active:scale-95 transition-transform cursor-pointer",
                          isPrimary ? "text-[10px]" : "text-[9px] opacity-80",
                          chipCol.chip, chipCol.text,
                        )}
                        aria-label={`What is ${chip.label}?`}
                      >
                        {chip.label}{cidx === 0 ? " ?" : ""}
                      </button>
                    );
                  })}

                  {/* Live status — shown when line has content */}
                  {hint && hint.status !== "empty" && (
                    <>
                      {hint.ruleHint && (
                        <span
                          className={cn(
                            "text-[10px] font-semibold leading-none",
                            hint.status === "looks_good"
                              ? "text-green-700"
                              : "text-amber-600",
                          )}
                        >
                          {hint.ruleHint}
                        </span>
                      )}
                      {hint.isSubjectiveRule && !hint.ruleHint && (
                        <span className="text-[10px] text-zinc-400 italic leading-none">
                          → submit
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* Input with live highlight overlay */}
                <div className="relative">
                  {/* Highlight overlay — sits behind input text via transparency */}
                  {hasSpans && (
                    <div
                      ref={(el) => { overlayRefs.current[i] = el; }}
                      className="absolute inset-0 pointer-events-none select-none overflow-hidden whitespace-nowrap flex items-center"
                      aria-hidden
                    >
                      <LiveHighlightText
                        text={value}
                        spans={lineSpans}
                        textClass={cn("text-sm font-normal leading-snug", col.textDark)}
                      />
                    </div>
                  )}

                  {/* Text input — transparent when overlay active */}
                  <input
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    value={value}
                    onChange={(e) => {
                      onLineChange(i, e.target.value);
                      // Sync overlay scroll after browser repaints the input
                      requestAnimationFrame(() => {
                        const input = inputRefs.current[i];
                        if (input) syncOverlayScroll(i, input.scrollLeft);
                      });
                    }}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onFocus={() => {
                      setFocusedLine(i);
                      requestAnimationFrame(() => {
                        const input = inputRefs.current[i];
                        if (input) syncOverlayScroll(i, input.scrollLeft);
                      });
                    }}
                    onBlur={() => setFocusedLine(null)}
                    onScroll={(e) => syncOverlayScroll(i, e.currentTarget.scrollLeft)}
                    disabled={disabled}
                    placeholder={value.trim() === "" ? m.chip.placeholder : ""}
                    style={hasSpans
                      ? { color: "transparent", caretColor: CARET_COLOR[m.chip.color] }
                      : undefined
                    }
                    className={cn(
                      "w-full bg-transparent text-sm font-normal relative z-10",
                      "placeholder-zinc-400 outline-none leading-snug",
                      // Only apply textDark when NOT showing overlay (overlay provides the color)
                      !hasSpans && col.textDark,
                      disabled && "cursor-not-allowed",
                    )}
                    autoCapitalize="sentences"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                </div>

                {/* Detected figurative phrase pill */}
                {hint?.detectedPhrase && (
                  <span className="text-[10px] text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full leading-none self-start truncate max-w-full">
                    detected: &ldquo;{hint.detectedPhrase}&rdquo;
                  </span>
                )}

                {/* Rhyme hint — shown below input once partner line has text */}
                {hint?.rhymeHint && (
                  <span
                    className={cn(
                      "text-[10px] font-medium leading-none",
                      hint.rhymeHint.includes("✓")
                        ? "text-green-600"
                        : "text-amber-500",
                    )}
                  >
                    {hint.rhymeHint}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* Footer: progress dots + bar count */}
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

      {/* Guidance note */}
      <p className="text-[10px] text-zinc-500 text-center mt-2 leading-relaxed">
        Live highlights are draft hints. Final checks run on submit.
      </p>

      {/* Rule help bottom sheet */}
      <RuleHelpSheet
        ruleKey={activeHelpKey}
        onClose={() => setActiveHelpKey(null)}
      />
    </div>
  );
}
