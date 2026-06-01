import Link from "next/link";

export default function ProfilePage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50">
      <nav className="flex items-center gap-4 px-5 py-4 border-b border-zinc-900">
        <Link href="/" className="text-zinc-400 hover:text-white transition-colors">
          ←
        </Link>
        <span className="font-black text-white">Profile</span>
      </nav>

      <div className="max-w-sm mx-auto px-5 py-16 text-center">
        <div className="w-20 h-20 rounded-full bg-zinc-800 border border-zinc-700 mx-auto mb-4 flex items-center justify-center text-3xl">
          👤
        </div>
        <h1 className="font-black text-2xl mb-2">Your Profile</h1>
        <p className="text-zinc-500 text-sm leading-relaxed mb-8">
          Profiles and accounts are coming in Phase 6. For now, you play as a guest.
        </p>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 text-left mb-6">
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Coming in Phase 6</p>
          <ul className="space-y-2 text-sm text-zinc-400">
            <li>· Username and display name</li>
            <li>· Submission history</li>
            <li>· Win count and stats</li>
            <li>· Shareable profile page</li>
            <li>· Follow other players</li>
          </ul>
        </div>

        <Link
          href="/create"
          className="block w-full bg-amber-400 text-zinc-950 font-black text-base py-4 rounded-2xl hover:bg-amber-300 active:scale-95 transition-all"
        >
          Create a Room
        </Link>
      </div>
    </main>
  );
}
