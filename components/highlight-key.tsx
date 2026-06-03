"use client";

import { HIGHLIGHT_COLORS_LIGHT } from "@/lib/utils";
import type { HighlightCategory } from "@/lib/types";

const KEY_ENTRIES: { category: HighlightCategory; label: string }[] = [
  { category: "END_RHYME",      label: "End Rhyme" },
  { category: "INTERNAL_RHYME", label: "Internal Rhyme" },
  { category: "ALLITERATION",   label: "Alliteration" },
  { category: "METAPHOR",       label: "Metaphor" },
  { category: "SIMILE",         label: "Simile" },
  { category: "REQUIRED_WORD",  label: "Required Word" },
  { category: "PUNCHLINE",      label: "Punchline" },
  { category: "CALLBACK",       label: "Callback" },
];

export function HighlightKey() {
  return (
    <div className="mt-3">
      <p className="text-[10px] text-zinc-500 text-center mb-2 leading-relaxed">
        Row colors show the assignment. Highlights show what Rhyzzle detected.
      </p>
      <div className="flex flex-wrap gap-1.5 justify-center">
        {KEY_ENTRIES.map(({ category, label }) => {
          const style = HIGHLIGHT_COLORS_LIGHT[category];
          return (
            <span key={category} className={`text-[9px] font-semibold ${style.className}`}>
              {label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
