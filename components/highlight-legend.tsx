import { cn } from "@/lib/utils";

const LEGEND = [
  { kind: "dot" as const, color: "bg-yellow-400", label: "Setup rhyme" },
  { kind: "dot" as const, color: "bg-cyan-400", label: "Internal rhyme" },
  { kind: "dot" as const, color: "bg-green-400", label: "Metaphor / Theme" },
  { kind: "dot" as const, color: "bg-purple-400", label: "Punchline" },
  { kind: "dot" as const, color: "bg-pink-400", label: "Callback" },
  { kind: "line" as const, color: "border-amber-400", label: "Required word" },
  { kind: "line" as const, color: "border-red-500", label: "Needs fixing" },
];

export function HighlightLegend() {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">
        Color Guide
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
        {LEGEND.map(({ kind, color, label }) => (
          <div key={label} className="flex items-center gap-2">
            {kind === "dot" ? (
              <div className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", color)} />
            ) : (
              <div
                className={cn("w-5 flex-shrink-0 border-b-2 border-dashed", color)}
              />
            )}
            <span className="text-xs text-zinc-500">{label}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-zinc-700 mt-3 leading-relaxed">
        Highlights appear after AI analysis — coming soon.
      </p>
    </div>
  );
}
