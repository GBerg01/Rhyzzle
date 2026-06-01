import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="flex flex-col min-h-screen bg-zinc-950 text-zinc-50">
      {/* Nav */}
      <nav className="flex items-center justify-between px-5 py-4 border-b border-zinc-900">
        <span className="text-xl font-black tracking-tight text-white">
          Rhyzzle
        </span>
        <Link
          href="/daily"
          className="text-sm text-zinc-400 hover:text-white transition-colors"
        >
          Daily
        </Link>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16">
        <div className="max-w-sm mx-auto">
          <p className="text-amber-400 text-xs font-semibold tracking-widest uppercase mb-4">
            The Daily Rap Puzzle
          </p>
          <h1 className="text-5xl font-black tracking-tighter leading-none mb-5">
            Who cooked?
          </h1>
          <p className="text-zinc-400 text-lg leading-relaxed mb-10">
            Create a room, share the link in your group chat, write bars to the
            same beat, and vote who cooked.
          </p>

          <Link
            href="/create"
            className="block w-full bg-amber-400 text-zinc-950 font-black text-lg py-4 rounded-2xl hover:bg-amber-300 active:scale-95 transition-all"
          >
            Create a Room
          </Link>

          <div className="mt-4 flex items-center gap-2">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-xs text-zinc-600">or</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>

          <Link
            href="/daily"
            className="block w-full mt-4 border border-zinc-800 text-zinc-300 font-semibold text-base py-4 rounded-2xl hover:border-zinc-700 hover:text-white active:scale-95 transition-all"
          >
            Play Today&apos;s Challenge
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 pb-16">
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
      <footer className="px-6 py-6 border-t border-zinc-900 text-center">
        <p className="text-xs text-zinc-600">
          Rhyzzle &mdash; No download. No account required.
        </p>
      </footer>
    </main>
  );
}

const HOW_IT_WORKS = [
  {
    title: "Create a room",
    desc: "Pick a beat, set your bar count, and choose your challenge rules.",
  },
  {
    title: "Share the link",
    desc: "Drop the link in your iMessage, Discord, Snapchat, or wherever your crew lives.",
  },
  {
    title: "Write your bars",
    desc: "Everyone listens to the same beat and writes 4, 6, or 8 bars. No account needed.",
  },
  {
    title: "Vote anonymously",
    desc: "Submissions are hidden until everyone votes. No bias. Just bars.",
  },
  {
    title: "Reveal the winner",
    desc: "The results drop. Names revealed. Cooked.",
  },
];
