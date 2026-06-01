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

  // Close on Escape key
  useEffect(() => {
    if (!help) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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

      {/* Bottom sheet */}
      <div
        className="fixed bottom-0 inset-x-0 z-50"
        role="dialog"
        aria-modal="true"
        aria-label={`Help: ${help.label}`}
      >
        <div className="max-w-sm mx-auto bg-white rounded-t-3xl shadow-2xl px-5 pt-4 pb-8">
          {/* Drag handle */}
          <div className="w-10 h-1 bg-zinc-200 rounded-full mx-auto mb-5" />

          {/* Badge */}
          <div className="mb-4">
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
          <div className="flex items-start gap-2 mb-5">
            <span className="text-amber-500 text-base leading-none mt-0.5" aria-hidden>
              💡
            </span>
            <p className="text-zinc-500 text-xs leading-relaxed">{help.tip}</p>
          </div>

          {/* Dismiss */}
          <button
            type="button"
            onClick={onClose}
            className="w-full bg-zinc-900 text-white font-black text-base py-3.5 rounded-2xl active:scale-95 transition-transform"
          >
            Got it
          </button>
        </div>
      </div>
    </>
  );
}
