"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { ChallengeDTO } from "@/lib/types";
import type { RuleHelpKey } from "@/lib/rule-help";
import { RuleHelpSheet } from "@/components/rule-help-sheet";
import { buildMeta, C, letterColor, getLineAllChips, type LineColor } from "@/lib/lyric-meta";
import { runLiveChecks, type LiveCheckState } from "@/lib/rule-checks/live-checks";

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
  const [activeHelpKey, setActiveHelpKey] = useState<RuleHelpKey | null>(null);
  const [focusedLine, setFocusedLine] = useState<number | null>(null);

  // Live check state — debounced 300ms so it doesn't fire on every keystroke
  const [liveState, setLiveState] = useState<LiveCheckState>(() =>
    runLiveChecks(lines, challenge),
  );
  useEffect(() => {
    const timer = setTimeout(() => {
      setLiveState(runLiveChecks(lines, challenge));
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

          return (
            <div
              key={i}
              className={cn(
                "flex items-stretch border-b border-zinc-100/80 last:border-b-0 transition-colors duration-150 relative",
                // Always keep the row colored — remove the old isEmpty → white fallback
                isFocused ? col.rowFocused : col.row,
              )}
            >
              {/* Colored focus strip — 3px left indicator when this row is active */}
              {isFocused && (
                <div
                  className={cn(
                    "absolute left-0 top-0 bottom-0 w-[3px] z-10",
                    FOCUS_STRIP[m.chip.color],
                  )}
                  aria-hidden
                />
              )}

              {/* Gutter: line number + scheme badge — always colored */}
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
                {/* Scheme badge — always colored regardless of content */}
                <span
                  className={cn(
                    "text-[10px] font-black rounded px-1 py-0.5 leading-none",
                    col.chip, col.text,
                  )}
                >
                  {m.schemeLetter}
                </span>
              </div>

              {/* Content: chips + input + hints */}
              <div className="flex-1 flex flex-col justify-center gap-1 px-3 py-2.5 min-w-0">
                {/* Rule chip row — all chips for this line, then status */}
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

                {/* Text input — color-tinted text tied to row identity */}
                <input
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  value={value}
                  onChange={(e) => onLineChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  onFocus={() => setFocusedLine(i)}
                  onBlur={() => setFocusedLine(null)}
                  disabled={disabled}
                  placeholder={value.trim() === "" ? m.chip.placeholder : ""}
                  className={cn(
                    "w-full bg-transparent text-sm font-normal",
                    "placeholder-zinc-400 outline-none leading-snug",
                    col.textDark,
                    disabled && "cursor-not-allowed",
                  )}
                  autoCapitalize="sentences"
                  autoCorrect="off"
                  spellCheck={false}
                />

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
        Live hints are guides. Humans still vote who cooked.
      </p>

      {/* Rule help bottom sheet */}
      <RuleHelpSheet
        ruleKey={activeHelpKey}
        onClose={() => setActiveHelpKey(null)}
      />
    </div>
  );
}
