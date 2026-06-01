"use client";

import { cn } from "@/lib/utils";

const LINE_HINTS = [
  "Line 1 — set the scene...",
  "Line 2 — build it up...",
  "Line 3 — go deeper...",
  "Line 4 — hit the punchline...",
  "Line 5 — keep the flow...",
  "Line 6 — ride it out...",
  "Line 7 — almost there...",
  "Line 8 — bring it home...",
];

interface LyricCanvasEditorProps {
  barCount: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function LyricCanvasEditor({
  barCount,
  value,
  onChange,
  disabled = false,
}: LyricCanvasEditorProps) {
  const lines = value.split("\n");
  const nonEmptyCount = lines.filter((l) => l.trim().length > 0).length;
  const rowCount = Math.max(barCount, lines.length);

  const isValid = nonEmptyCount === barCount;
  const tooMany = nonEmptyCount > barCount;
  const tooFew = nonEmptyCount > 0 && nonEmptyCount < barCount;

  const placeholder = Array.from(
    { length: barCount },
    (_, i) => LINE_HINTS[i] ?? `Line ${i + 1}...`
  ).join("\n");

  let footerMsg = `Write your ${barCount} bars above`;
  if (isValid) footerMsg = "✓ All bars written";
  else if (tooMany) footerMsg = `Trim to ${barCount} bars`;
  else if (tooFew) {
    const need = barCount - nonEmptyCount;
    footerMsg = `${need} more bar${need !== 1 ? "s" : ""} to go`;
  }

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Your Bars
        </span>
        <span
          className={cn(
            "text-xs font-mono font-bold tabular-nums",
            isValid
              ? "text-green-400"
              : nonEmptyCount === 0
              ? "text-zinc-600"
              : "text-amber-400"
          )}
        >
          {nonEmptyCount} / {barCount}
        </span>
      </div>

      {/* Canvas card */}
      <div
        className={cn(
          "bg-white rounded-2xl overflow-hidden shadow-2xl border-2 transition-colors duration-300",
          disabled
            ? "opacity-60 border-transparent"
            : isValid
            ? "border-green-400/40"
            : "border-transparent"
        )}
      >
        <div className="flex">
          {/* Line number gutter */}
          <div
            className="bg-zinc-50 border-r border-zinc-100 py-4 pl-3 pr-2.5 flex-shrink-0 select-none"
            aria-hidden
          >
            {Array.from({ length: rowCount }, (_, i) => (
              <div
                key={i}
                className={cn(
                  "text-right text-xs font-mono font-semibold",
                  i >= barCount
                    ? "text-red-400"
                    : i < nonEmptyCount
                    ? "text-violet-400"
                    : "text-zinc-300"
                )}
                style={{ height: "1.75rem", lineHeight: "1.75rem" }}
              >
                {i + 1}
              </div>
            ))}
          </div>

          {/* Main textarea */}
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder={placeholder}
            rows={rowCount}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="sentences"
            className="flex-1 py-4 px-4 text-zinc-900 text-base resize-none outline-none bg-white placeholder-zinc-300 font-normal"
            style={{ lineHeight: "1.75rem" }}
          />
        </div>

        {/* Footer: progress dots + label */}
        <div className="border-t border-zinc-100 bg-zinc-50 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-1">
            {Array.from({ length: barCount }, (_, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-full transition-all duration-200",
                  i < nonEmptyCount
                    ? tooMany
                      ? "w-2 h-2 bg-red-400"
                      : "w-2 h-2 bg-violet-500"
                    : "w-1.5 h-1.5 bg-zinc-300"
                )}
              />
            ))}
          </div>
          <span
            className={cn(
              "text-xs",
              isValid
                ? "text-green-600 font-semibold"
                : tooMany
                ? "text-red-500 font-semibold"
                : "text-zinc-500"
            )}
          >
            {footerMsg}
          </span>
        </div>
      </div>
    </div>
  );
}
