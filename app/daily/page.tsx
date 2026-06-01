import Link from "next/link";

export default function DailyPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50">
      <nav className="flex items-center gap-4 px-5 py-4 border-b border-zinc-900">
        <Link href="/" className="text-zinc-400 hover:text-white transition-colors">
          ←
        </Link>
        <span className="font-black text-white">Rhyzzle Daily</span>
      </nav>

      <div className="max-w-sm mx-auto px-5 py-16 text-center">
        <div className="text-4xl mb-4">📅</div>
        <h1 className="font-black text-3xl mb-3">Daily Challenge</h1>
        <p className="text-zinc-500 text-base leading-relaxed mb-8">
          Every day, one beat. One challenge. Everyone competes.
        </p>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8 text-left">
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Coming in Phase 3</p>
          <p className="text-zinc-300 text-sm leading-relaxed">
            The daily challenge is where Rhyzzle goes public. One official prompt, one beat, and
            all submissions ranked by community votes. Check back soon.
          </p>
        </div>

        <Link
          href="/create"
          className="block w-full bg-amber-400 text-zinc-950 font-black text-lg py-4 rounded-2xl hover:bg-amber-300 active:scale-95 transition-all"
        >
          Create a Private Room
        </Link>
      </div>
    </main>
  );
}
