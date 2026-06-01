import Link from "next/link";

export default function DiscoverPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50">
      <nav className="flex items-center gap-4 px-5 py-4 border-b border-zinc-900">
        <Link href="/" className="text-zinc-400 hover:text-white transition-colors">
          ←
        </Link>
        <span className="font-black text-white">Discover</span>
      </nav>

      <div className="max-w-sm mx-auto px-5 py-16 text-center">
        <div className="text-4xl mb-4">🔥</div>
        <h1 className="font-black text-3xl mb-3">Discover</h1>
        <p className="text-zinc-500 text-base leading-relaxed mb-8">
          The best bars from the community. Ranked by the people.
        </p>

        {/* Placeholder tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
          {["Hot Today", "Top This Week", "New", "Most Debated", "Cooked"].map(
            (tab) => (
              <button
                key={tab}
                className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border border-zinc-800 text-zinc-500"
              >
                {tab}
              </button>
            )
          )}
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-left">
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Coming in Phase 4</p>
          <p className="text-zinc-300 text-sm leading-relaxed">
            The Discover feed shows the best public submissions from Rhyzzle Daily. Rankings use
            a simple hot score formula — no algorithms, just engagement and time. Likes, votes,
            shares, saves, and comments all count.
          </p>
        </div>
      </div>
    </main>
  );
}
