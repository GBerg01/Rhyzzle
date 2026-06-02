import Link from "next/link";
import { DAILY_BEAT, DAILY_TITLE, DAILY_PROMPT, DAILY_REQUIRED_WORDS, DAILY_MODES } from "@/lib/daily-challenge";

const SCHEME_COLORS: Record<string, string> = {
  A: "bg-sky-500",
  B: "bg-violet-500",
  C: "bg-emerald-500",
  D: "bg-rose-500",
};

function SchemePreview({ scheme }: { scheme: string }) {
  const letters = scheme.split("");
  return (
    <div className="flex gap-1 mt-3 flex-wrap">
      {letters.map((letter, i) => (
        <div
          key={i}
          className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-black ${SCHEME_COLORS[letter] ?? "bg-zinc-600"}`}
        >
          {letter}
        </div>
      ))}
    </div>
  );
}

export default function PlayPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50">
      {/* Nav */}
      <nav className="flex items-center gap-4 px-5 py-4 border-b border-zinc-900">
        <Link href="/" className="text-zinc-400 hover:text-white transition-colors text-lg">
          ←
        </Link>
        <span className="font-black text-white">Play Today</span>
      </nav>

      <div className="max-w-sm mx-auto px-5 py-8">

        {/* Today's challenge summary */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-8">
          <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-1">
            Today&apos;s Challenge
          </p>
          <p className="text-white font-black text-lg mb-0.5">{DAILY_TITLE}</p>
          <p className="text-zinc-400 text-sm leading-relaxed mb-3">{DAILY_PROMPT}</p>

          <div className="flex items-center gap-2 mb-3">
            <span className="text-zinc-500 text-xs">Beat:</span>
            <span className="text-zinc-200 text-xs font-semibold">{DAILY_BEAT.title}</span>
            <span className="text-zinc-600 text-xs">·</span>
            <span className="text-zinc-500 text-xs">{DAILY_BEAT.bpm} BPM</span>
          </div>

          <div className="flex gap-1.5 flex-wrap">
            {DAILY_REQUIRED_WORDS.map((word) => (
              <span
                key={word}
                className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full"
              >
                {word}
              </span>
            ))}
          </div>
        </div>

        {/* Mode picker */}
        <p className="text-zinc-400 text-xs font-black uppercase tracking-widest mb-4">
          Pick your difficulty
        </p>

        <div className="space-y-3">
          {DAILY_MODES.map((mode) => (
            <Link
              key={mode.barCount}
              href={`/play/${mode.barCount}`}
              className="block bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-amber-400/60 active:scale-[0.98] transition-all group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-white font-black text-lg">{mode.label}</span>
                    <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wide bg-zinc-800 px-2 py-0.5 rounded-full">
                      {mode.sublabel}
                    </span>
                  </div>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    {mode.description}
                  </p>
                  <SchemePreview scheme={mode.scheme} />
                </div>
                <span className="text-zinc-600 group-hover:text-amber-400 transition-colors ml-4 mt-1 text-xl">
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>

        <p className="text-zinc-600 text-xs text-center mt-8 leading-relaxed">
          Each mode uses the same beat and prompt.<br />You choose how deep to go.
        </p>
      </div>
    </main>
  );
}
