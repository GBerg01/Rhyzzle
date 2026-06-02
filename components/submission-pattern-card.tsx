"use client";

import { cn } from "@/lib/utils";
import type { ChallengeDTO, SubmissionLineDTO } from "@/lib/types";
import { buildMeta, C } from "@/lib/lyric-meta";
import { HighlightedText } from "@/components/highlighted-text";

const PLACEMENT_EMOJI: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

interface SubmissionPatternCardProps {
  challenge: ChallengeDTO;
  lines: SubmissionLineDTO[];
  label?: string;
  // Voter's current ranking position (1=best) — shown during voting phase
  rankBadge?: number | null;
  // Final placement — shown in reveal/results phase
  placementBadge?: number | null;
  rankingPoints?: number;
  isOwn?: boolean;
  onClick?: () => void;
}

export function SubmissionPatternCard({
  challenge,
  lines,
  label,
  rankBadge = null,
  placementBadge = null,
  rankingPoints,
  isOwn = false,
  onClick,
}: SubmissionPatternCardProps) {
  const meta = buildMeta(challenge);
  const isInteractive = !!onClick && !isOwn;

  const borderClass = isOwn
    ? "border-zinc-800"
    : rankBadge === 1
    ? "border-amber-400 shadow-lg shadow-amber-900/20"
    : rankBadge
    ? "border-violet-500/60 shadow-md shadow-violet-900/20"
    : placementBadge === 1
    ? "border-amber-400/60"
    : "border-zinc-800 hover:border-zinc-700";

  return (
    <div
      role={isInteractive ? "button" : undefined}
      onClick={isInteractive ? onClick : undefined}
      className={cn(
        "rounded-2xl overflow-hidden border-2 transition-all duration-150",
        isInteractive ? "cursor-pointer active:scale-[0.99]" : "",
        isOwn ? "opacity-65" : "",
        borderClass,
      )}
    >
      {/* Card header */}
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2 border-b",
          isOwn
            ? "bg-zinc-800/60 border-zinc-700"
            : rankBadge
            ? "bg-violet-950/40 border-violet-800/40"
            : placementBadge === 1
            ? "bg-amber-950/40 border-amber-800/30"
            : "bg-zinc-800/60 border-zinc-700",
        )}
      >
        <span className="text-xs font-black uppercase tracking-widest text-zinc-400">
          {label}
        </span>
        <div className="flex items-center gap-2">
          {rankBadge !== null && (
            <span
              className={cn(
                "text-xs font-black px-2 py-0.5 rounded-full",
                rankBadge === 1
                  ? "text-amber-900 bg-amber-400"
                  : "text-violet-200 bg-violet-500/40",
              )}
            >
              #{rankBadge}
            </span>
          )}
          {placementBadge !== null && (
            <span className="text-sm leading-none">
              {PLACEMENT_EMOJI[placementBadge] ?? `#${placementBadge}`}
            </span>
          )}
          {typeof rankingPoints === "number" && rankingPoints > 0 && (
            <span className="text-xs text-zinc-500 font-semibold tabular-nums">
              {rankingPoints}pts
            </span>
          )}
        </div>
      </div>

      {/* Pattern board — white background with colored row accents */}
      <div className="bg-white">
        {meta.map((m, i) => {
          const line = lines.find((l) => l.lineIndex === i);
          const text = line?.text ?? "";
          const col = C[m.chip.color];
          return (
            <div
              key={i}
              className={cn(
                "flex items-stretch border-b border-zinc-100/80 last:border-b-0",
                col.row,
              )}
            >
              {/* Gutter: line number + scheme badge */}
              <div
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2.5 border-r border-zinc-100 flex-shrink-0 select-none",
                  col.gutter,
                )}
                style={{ width: "38px" }}
                aria-hidden
              >
                <span className="text-[10px] font-black text-zinc-400 leading-none tabular-nums">
                  {i + 1}
                </span>
                <span
                  className={cn(
                    "text-[9px] font-black rounded px-1 py-0.5 leading-none",
                    col.chip, col.text,
                  )}
                >
                  {m.schemeLetter}
                </span>
              </div>

              {/* Content: chip label + bar text */}
              <div className="flex-1 flex flex-col justify-center gap-0.5 px-2.5 py-2 min-w-0">
                <span
                  className={cn(
                    "text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full self-start leading-none",
                    col.chip, col.text,
                  )}
                >
                  {m.chip.label}
                </span>
                {text ? (
                  <p className="text-sm text-zinc-900 leading-snug font-normal">
                    <HighlightedText
                      text={text}
                      spans={line?.highlightSpans ?? []}
                    />
                  </p>
                ) : (
                  <p className="text-sm text-zinc-300 italic leading-snug">—</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
