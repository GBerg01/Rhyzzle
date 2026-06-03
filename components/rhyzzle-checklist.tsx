"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { ChallengeDTO } from "@/lib/types";
import {
  buildChecklist,
  type ChecklistItem,
  type ChecklistState,
  type ChecklistStatus,
} from "@/lib/rule-checks/checklist";

// ─── Status display maps ───────────────────────────────────────────────────────

const STATUS_ICON: Record<ChecklistStatus, string> = {
  COMPLETE:          "✓",
  NEEDS_REVIEW:      "~",
  MISSING:           "✗",
  CHECK_AFTER_SUBMIT: "→",
};

const STATUS_ICON_COLOR: Record<ChecklistStatus, string> = {
  COMPLETE:          "text-green-400",
  NEEDS_REVIEW:      "text-amber-400",
  MISSING:           "text-red-400",
  CHECK_AFTER_SUBMIT: "text-zinc-500",
};

const STATUS_LABEL_COLOR: Record<ChecklistStatus, string> = {
  COMPLETE:          "text-zinc-200",
  NEEDS_REVIEW:      "text-amber-200",
  MISSING:           "text-red-300",
  CHECK_AFTER_SUBMIT: "text-zinc-500",
};

const STATUS_DETAIL_COLOR: Record<ChecklistStatus, string> = {
  COMPLETE:          "text-zinc-500",
  NEEDS_REVIEW:      "text-amber-500/80",
  MISSING:           "text-red-400/80",
  CHECK_AFTER_SUBMIT: "text-zinc-600",
};

// ─── Sub-components ────────────────────────────────────────────────────────────

function WordChip({ word, found }: { word: string; found: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center text-[9px] font-mono font-black px-1.5 py-0.5 rounded leading-none",
        found
          ? "bg-green-900/30 text-green-400 border border-green-800/50"
          : "bg-red-900/20 text-red-400 border border-red-800/40",
      )}
    >
      {word}{found ? " ✓" : " ✗"}
    </span>
  );
}

function ChecklistRow({ item }: { item: ChecklistItem }) {
  return (
    <div className="flex items-start gap-3 px-4 py-2.5">
      {/* Status icon */}
      <span
        className={cn(
          "text-sm font-black leading-none mt-px flex-shrink-0 w-4 text-center tabular-nums",
          STATUS_ICON_COLOR[item.status],
        )}
        aria-hidden
      >
        {STATUS_ICON[item.status]}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <span className={cn("text-xs font-semibold leading-snug", STATUS_LABEL_COLOR[item.status])}>
          {item.label}
        </span>

        {/* Word chips for required-words item */}
        {item.wordChips && item.wordChips.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {item.wordChips.map(({ word, found }) => (
              <WordChip key={word} word={word} found={found} />
            ))}
          </div>
        )}

        {/* Detail text */}
        {item.detail && !item.wordChips && (
          <p className={cn("text-[10px] mt-0.5 leading-relaxed", STATUS_DETAIL_COLOR[item.status])}>
            {item.detail}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Header badge ──────────────────────────────────────────────────────────────

function SummaryBadge({ state }: { state: ChecklistState }) {
  const { completeCount, needsReviewCount, missingCount, items } = state;
  const total = items.length;
  const allDone = completeCount === total;
  const hasMissing = missingCount > 0;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Done count */}
      <span
        className={cn(
          "text-xs font-black px-2 py-0.5 rounded-full tabular-nums",
          allDone
            ? "bg-green-400/20 text-green-400"
            : hasMissing
            ? "bg-zinc-800 text-zinc-400"
            : "bg-amber-400/15 text-amber-400",
        )}
      >
        {completeCount} / {total}
      </span>

      {/* Inline warning counts */}
      {needsReviewCount > 0 && (
        <span className="text-[10px] text-amber-400 font-semibold leading-none">
          {needsReviewCount}~
        </span>
      )}
      {missingCount > 0 && (
        <span className="text-[10px] text-red-400 font-semibold leading-none">
          {missingCount} missing
        </span>
      )}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

interface RhyzzleChecklistProps {
  lines: string[];
  challenge: ChallengeDTO;
}

export function RhyzzleChecklist({ lines, challenge }: RhyzzleChecklistProps) {
  const [state, setState] = useState<ChecklistState>(() =>
    buildChecklist(lines, challenge),
  );
  const [expanded, setExpanded] = useState(false);

  // Debounce — same 300ms cadence as live highlights
  useEffect(() => {
    const timer = setTimeout(() => {
      setState(buildChecklist(lines, challenge));
    }, 300);
    return () => clearTimeout(timer);
    // challenge is stable for the lifetime of a writing session
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines]);

  const { items } = state;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      {/* Header — always visible, tap to expand/collapse */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left select-none"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-xs font-black uppercase tracking-widest text-zinc-400">
            Checklist
          </span>
          <SummaryBadge state={state} />
        </div>
        <span className="text-zinc-600 text-[10px] font-semibold flex-shrink-0 ml-2">
          {expanded ? "▲ hide" : "▼ show"}
        </span>
      </button>

      {/* Expanded item list */}
      {expanded && (
        <div className="border-t border-zinc-800">
          <div className="divide-y divide-zinc-800/50">
            {items.map((item) => (
              <ChecklistRow key={item.id} item={item} />
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 pt-2 pb-3 border-t border-zinc-800/50">
            <p className="text-[10px] text-zinc-600 leading-relaxed">
              Hints only — humans still vote who cooked.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
