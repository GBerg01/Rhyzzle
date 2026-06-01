import { cn } from "@/lib/utils";
import type { ChallengeDTO } from "@/lib/types";

interface ChallengeCardProps {
  challenge: ChallengeDTO;
  className?: string;
}

const CONSTRAINT_ICONS: Record<string, string> = {
  END_RHYME: "🎯",
  INTERNAL_RHYME: "🔄",
  LINE_START_RHYMES_WITH_PREVIOUS_END: "⛓",
  METAPHOR: "🌊",
  PUNCHLINE: "💥",
  CALLBACK: "🔁",
  ALLITERATION: "🔤",
  ASSONANCE: "🎵",
  REQUIRED_WORD: "📌",
  THEME_REFERENCE: "🎨",
  RHYME_SCHEME: "📐",
  LINE_COUNT: "📏",
};

export function ChallengeCard({ challenge, className }: ChallengeCardProps) {
  return (
    <div
      className={cn(
        "bg-zinc-900 border border-zinc-800 rounded-xl p-4",
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-0.5">
            Challenge
          </p>
          <h3 className="font-black text-base text-white">{challenge.title}</h3>
        </div>
        <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-1 rounded-full flex-shrink-0 ml-2">
          {challenge.barCount} bars
        </span>
      </div>

      {challenge.description && (
        <p className="text-xs text-zinc-500 leading-relaxed mb-3">
          {challenge.description}
        </p>
      )}

      {/* Rules */}
      {challenge.rules.length > 0 && (
        <div className="space-y-2">
          {challenge.rules.map((rule) => (
            <div key={rule.id} className="flex items-start gap-2.5">
              <span className="text-sm flex-shrink-0 mt-0.5">
                {CONSTRAINT_ICONS[rule.type] ?? "•"}
              </span>
              <p className="text-xs text-zinc-300 leading-relaxed">
                {rule.description}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Required words */}
      {challenge.requiredWords.length > 0 && (
        <div className="mt-3 pt-3 border-t border-zinc-800">
          <p className="text-xs text-zinc-500 mb-2">Required words:</p>
          <div className="flex flex-wrap gap-1.5">
            {challenge.requiredWords.map((rw) => (
              <span
                key={rw.id}
                className="text-xs bg-amber-400/10 text-amber-400 border border-amber-400/30 px-2 py-0.5 rounded-full font-mono"
              >
                {rw.word}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
