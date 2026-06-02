"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { ChallengeDTO } from "@/lib/types";
import type { RuleHelpKey } from "@/lib/rule-help";
import { RuleHelpSheet } from "@/components/rule-help-sheet";
import { buildMeta, C, letterColor } from "@/lib/lyric-meta";

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

      {/* Required words */}
      {challenge.requiredWords.length > 0 && (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Required:
          </span>
          {challenge.requiredWords.map((rw) => (
            <button
              key={rw.id}
              type="button"
              onClick={(e) => openHelp("REQUIRED_WORD", e)}
              className="text-xs font-mono font-black uppercase tracking-wide text-amber-900 bg-amber-300 border border-amber-400/60 px-2.5 py-0.5 rounded-full active:scale-95 transition-transform cursor-pointer"
              title="Tap for help"
            >
              {rw.word} ?
            </button>
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
                {/* Rule chip — tappable for help */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={(e) => openHelp(m.chip.helpKey, e)}
                    className={cn(
                      "text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full flex-shrink-0 leading-none",
                      "active:scale-95 transition-transform cursor-pointer",
                      col.chip, col.text,
                    )}
                    aria-label={`What is ${m.chip.label}?`}
                  >
                    {m.chip.label} ?
                  </button>
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

      {/* Rule help bottom sheet */}
      <RuleHelpSheet
        ruleKey={activeHelpKey}
        onClose={() => setActiveHelpKey(null)}
      />
    </div>
  );
}
