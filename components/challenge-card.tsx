import { cn } from "@/lib/utils";
import type { ChallengeDTO, ConstraintType } from "@/lib/types";

interface ChallengeCardProps {
  challenge: ChallengeDTO;
  className?: string;
}

const RULE_BADGE: Record<ConstraintType, string> = {
  END_RHYME:                           "bg-yellow-400 text-zinc-900",
  INTERNAL_RHYME:                      "bg-cyan-400 text-zinc-900",
  LINE_START_RHYMES_WITH_PREVIOUS_END: "bg-cyan-400 text-zinc-900",
  METAPHOR:                            "bg-green-400 text-zinc-900",
  THEME_REFERENCE:                     "bg-green-400 text-zinc-900",
  PUNCHLINE:                           "bg-purple-400 text-white",
  CALLBACK:                            "bg-pink-400 text-white",
  ALLITERATION:                        "bg-blue-400 text-white",
  ASSONANCE:                           "bg-sky-400 text-zinc-900",
  REQUIRED_WORD:                       "bg-amber-400 text-zinc-900",
  RHYME_SCHEME:                        "bg-indigo-400 text-white",
  LINE_COUNT:                          "bg-zinc-500 text-white",
};

export function ChallengeCard({ challenge, className }: ChallengeCardProps) {
  return (
    <div
      className={cn(
        "bg-zinc-900/80 border border-zinc-800/60 rounded-2xl overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-zinc-800/50">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-0.5">
            Your Challenge
          </p>
          <h3 className="font-black text-base text-white leading-tight">
            {challenge.title}
          </h3>
        </div>
        <span className="text-xs font-black bg-violet-600 text-white px-3 py-1.5 rounded-full flex-shrink-0 ml-3 leading-none">
          {challenge.barCount} BARS
        </span>
      </div>

      {/* Rules */}
      {challenge.rules.length > 0 && (
        <div className="px-4 py-3 space-y-3">
          {challenge.rules.map((rule, i) => (
            <div key={rule.id} className="flex items-start gap-3">
              <span
                className={cn(
                  "w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center",
                  "text-xs font-black mt-0.5",
                  RULE_BADGE[rule.type]
                )}
              >
                {i + 1}
              </span>
              <p className="text-sm text-zinc-300 leading-relaxed">
                {rule.description}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Required words */}
      {challenge.requiredWords.length > 0 && (
        <div className="px-4 pb-4 pt-1 border-t border-zinc-800/50">
          <p className="text-xs text-zinc-500 mt-2 mb-2">Must include:</p>
          <div className="flex flex-wrap gap-2">
            {challenge.requiredWords.map((rw) => (
              <span
                key={rw.id}
                className="text-xs font-mono font-bold uppercase tracking-wide text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2.5 py-1 rounded-full"
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
