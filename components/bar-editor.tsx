"use client";

import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface BarEditorProps {
  barCount: number;
  bars: string[];
  onChange: (bars: string[]) => void;
  disabled?: boolean;
  placeholder?: (lineIndex: number) => string;
}

export function BarEditor({
  barCount,
  bars,
  onChange,
  disabled = false,
  placeholder,
}: BarEditorProps) {
  const inputRefs = useRef<(HTMLTextAreaElement | null)[]>([]);

  // Ensure bars array matches barCount
  const normalizedBars = Array.from({ length: barCount }, (_, i) => bars[i] ?? "");

  function handleChange(index: number, value: string) {
    const next = [...normalizedBars];
    next[index] = value;
    onChange(next);
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter key moves to next line
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (index < barCount - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    }
    // Backspace on empty line moves to previous
    if (e.key === "Backspace" && normalizedBars[index] === "" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  const defaultPlaceholder = (i: number) => {
    const hints = [
      "Line 1 — set the scene...",
      "Line 2 — build it up...",
      "Line 3 — go deeper...",
      "Line 4 — hit the punchline...",
      "Line 5 — keep the flow...",
      "Line 6 — ride it out...",
      "Line 7 — almost there...",
      "Line 8 — bring it home...",
    ];
    return hints[i] ?? `Line ${i + 1}...`;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">
          Your Bars
        </p>
        <p className="text-xs text-zinc-600">{barCount} lines</p>
      </div>

      {normalizedBars.map((bar, i) => (
        <div key={i} className="flex items-start gap-3">
          {/* Line number */}
          <span className="text-xs text-zinc-700 font-mono mt-3.5 w-4 text-right flex-shrink-0">
            {i + 1}
          </span>

          {/* Input */}
          <div className="flex-1">
            <textarea
              ref={(el) => {
                inputRefs.current[i] = el;
              }}
              value={bar}
              onChange={(e) => {
                handleChange(i, e.target.value);
                autoResize(e.target);
              }}
              onKeyDown={(e) => handleKeyDown(i, e)}
              disabled={disabled}
              placeholder={(placeholder ?? defaultPlaceholder)(i)}
              rows={1}
              className={cn(
                "w-full bg-zinc-900 border rounded-xl px-4 py-3 text-white placeholder-zinc-700",
                "text-sm leading-relaxed resize-none overflow-hidden",
                "focus:outline-none transition-colors",
                bar.trim().length > 0
                  ? "border-zinc-700 focus:border-amber-400"
                  : "border-zinc-800 focus:border-zinc-700",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            />
          </div>
        </div>
      ))}

      {/* Word count indicator */}
      <div className="flex justify-end pt-1">
        <span className="text-xs text-zinc-700">
          {normalizedBars.filter((b) => b.trim().length > 0).length} /{" "}
          {barCount} lines written
        </span>
      </div>
    </div>
  );
}
