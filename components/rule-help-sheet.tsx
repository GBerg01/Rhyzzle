"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { RULE_HELP } from "@/lib/rule-help";
import type { RuleHelpKey } from "@/lib/rule-help";

interface RuleHelpSheetProps {
  ruleKey: RuleHelpKey | null;
  onClose: () => void;
}

export function RuleHelpSheet({ ruleKey, onClose }: RuleHelpSheetProps) {
  const help = ruleKey ? RULE_HELP[ruleKey] : null;

  useEffect(() => {
    if (!help) return;

    // Lock body scroll while sheet is open
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [help, onClose]);

  if (!help) return null;

  return (
    <>
      {/* Backdrop — tap to dismiss */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Bottom sheet — max 85dvh, scrollable content, pinned button */}
      <div
        className="fixed bottom-0 inset-x-0 z-50"
        role="dialog"
        aria-modal="true"
        aria-label={`Help: ${help.label}`}
      >
        <div
          className="max-w-sm mx-auto w-full bg-white rounded-t-3xl shadow-2xl flex flex-col overflow-hidden"
          style={{ maxHeight: "85dvh" }}
        >
          {/* Drag handle + close button — always visible at top */}
          <div className="flex-shrink-0 pt-4 pb-2 px-5 flex items-center justify-between">
            <div className="w-10 h-1 bg-zinc-200 rounded-full" />
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 active:scale-90 transition-all"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-5 pb-2" style={{ WebkitOverflowScrolling: "touch" }}>
            {/* Badge */}
            <div className="mb-4 mt-2">
              <span
                className={cn(
                  "inline-block text-xs font-black uppercase tracking-wide px-3 py-1 rounded-full",
                  help.chipClass,
                  help.textClass,
                )}
              >
                {help.label}
              </span>
            </div>

            {/* Definition */}
            <p className="text-zinc-800 text-sm leading-relaxed mb-4">
              {help.shortDefinition}
            </p>

            {/* Example */}
            <div className="bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-3 mb-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5">
                Example
              </p>
              <p className="text-zinc-700 text-sm italic leading-relaxed">
                &ldquo;{help.example}&rdquo;
              </p>
            </div>

            {/* Tip */}
            <div className="flex items-start gap-2 pb-2">
              <span className="text-amber-500 text-base leading-none mt-0.5" aria-hidden>
                💡
              </span>
              <p className="text-zinc-500 text-xs leading-relaxed">{help.tip}</p>
            </div>
          </div>

          {/* Dismiss — always pinned at bottom */}
          <div className="flex-shrink-0 px-5 pb-8 pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="w-full bg-zinc-900 text-white font-black text-base py-3.5 rounded-2xl active:scale-95 transition-transform"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
