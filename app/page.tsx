import Link from "next/link";
import { DAILY_BEAT, DAILY_TITLE, DAILY_PROMPT, DAILY_REQUIRED_WORDS } from "@/lib/daily-challenge";

export default function LandingPage() {
  return (
    <main className="flex flex-col min-h-screen bg-zinc-950 text-zinc-50">
      {/* Nav */}
      <nav className="flex items-center justify-between px-5 py-4 border-b border-zinc-900">
        <span className="text-xl font-black tracking-tight text-white">Rhyzzle</span>
        <Link
          href="/discover"
          className="text-sm text-zinc-400 hover:text-white transition-colors"
        >
          Discover
        </Link>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-5 py-12">
        <div className="max-w-sm mx-auto w-full">

          {/* Daily label */}
          <p className="text-amber-400 text-xs font-black uppercase tracking-widest mb-4 text-center">
            Today&apos;s Rhyzzle
          </p>

          {/* Beat card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4 flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-2xl flex-shrink-0">
              🎵
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-0.5">
                Beat
              </p>
              <p className="text-white font-black text-base truncate">{DAILY_BEAT.title}</p>
              <p className="text-zinc-500 text-xs mt-0.5">
                {DAILY_BEAT.genre} · {DAILY_BEAT.bpm} BPM
              </p>
            </div>
          </div>

          {/* Prompt */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-4">
            <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-1.5">
              Today&apos;s Prompt
            </p>
            <p className="text-white font-black text-xl leading-snug mb-1">{DAILY_TITLE}</p>
            <p className="text-zinc-400 text-sm leading-relaxed">{DAILY_PROMPT}</p>
          </div>

          {/* Required words */}
          <div className="mb-8">
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-2">
              Required Words
            </p>
            <div className="flex gap-2 flex-wrap">
              {DAILY_REQUIRED_WORDS.map((word) => (
                <span
                  key={word}
                  className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-black uppercase tracking-wide px-3 py-1.5 rounded-full"
                >
                  {word}
                </span>
              ))}
            </div>
          </div>

          {/* Primary CTA */}
          <Link
            href="/play"
            className="block w-full bg-amber-400 text-zinc-950 font-black text-lg py-4 rounded-2xl hover:bg-amber-300 active:scale-95 transition-all text-center"
          >
            Play Today →
          </Link>

          <div className="mt-4 flex items-center gap-2">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-xs text-zinc-600">or</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>

          <Link
            href="/create"
            className="block w-full mt-4 border border-zinc-800 text-zinc-300 font-semibold text-base py-4 rounded-2xl hover:border-zinc-700 hover:text-white active:scale-95 transition-all text-center"
          >
            Start Group Room
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="px-5 pb-16">
        <div className="max-w-sm mx-auto">
          <h2 className="text-xs font-semibold tracking-widest uppercase text-zinc-500 mb-6 text-center">
            How it works
          </h2>
          <div className="space-y-4">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-amber-400 font-black text-sm flex-shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <div>
                  <p className="font-semibold text-zinc-100">{step.title}</p>
                  <p className="text-sm text-zinc-500 mt-0.5">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-5 py-6 border-t border-zinc-900 text-center">
        <p className="text-xs text-zinc-600">Rhyzzle &mdash; No download. No account required.</p>
      </footer>
    </main>
  );
}

const HOW_IT_WORKS = [
  {
    title: "Everyone gets the same challenge",
    desc: "One beat, one prompt, one set of rules — shared by all players today.",
  },
  {
    title: "Pick your difficulty",
    desc: "3 bars for a quick punch. 6 bars for the full challenge. 8 bars if you're ready.",
  },
  {
    title: "Share the room link",
    desc: "Drop the link in your group chat. Everyone joins instantly — no account needed.",
  },
  {
    title: "Write your bars",
    desc: "Listen to the beat, follow the rules, write your verse.",
  },
  {
    title: "Vote anonymously, reveal the winner",
    desc: "No bias. Just bars. The best verse wins.",
  },
];
