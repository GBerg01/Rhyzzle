"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { DAILY_BEAT, DAILY_TITLE, DAILY_PROMPT, DAILY_REQUIRED_WORDS, DAILY_MODES } from "@/lib/daily-challenge";
import type { DailyBarCount } from "@/lib/daily-challenge";
import { cn } from "@/lib/utils";

function CreateRoomForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const paramBarCount = Number(searchParams.get("barCount")) as DailyBarCount;
  const initialBarCount: DailyBarCount =
    [3, 6, 8].includes(paramBarCount) ? paramBarCount : 6;

  const [hostNickname, setHostNickname] = useState("");
  const [barCount, setBarCount] = useState<DailyBarCount>(initialBarCount);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCreate = hostNickname.trim().length > 0;

  async function handleCreate() {
    if (!canCreate) return;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostNickname: hostNickname.trim(),
          source: "DAILY_CHALLENGE",
          barCount,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to create room");
      }

      const { roomCode } = await res.json();
      router.push(`/room/${roomCode}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsLoading(false);
    }
  }

  const selectedMode = DAILY_MODES.find((m) => m.barCount === barCount);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50">
      {/* Nav */}
      <nav className="flex items-center gap-4 px-5 py-4 border-b border-zinc-900">
        <Link href="/play" className="text-zinc-400 hover:text-white transition-colors text-lg">
          ←
        </Link>
        <span className="font-black text-white">Start Group Room</span>
      </nav>

      <div className="max-w-sm mx-auto px-5 py-8 space-y-8">

        {/* Today's challenge preview — read-only */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-2">
            Today&apos;s Challenge
          </p>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-lg flex-shrink-0">
              🎵
            </div>
            <div>
              <p className="text-white font-black text-sm">{DAILY_TITLE}</p>
              <p className="text-zinc-500 text-xs">{DAILY_BEAT.title} · {DAILY_BEAT.bpm} BPM</p>
            </div>
          </div>
          <p className="text-zinc-400 text-xs leading-relaxed mb-3">{DAILY_PROMPT}</p>
          <div className="flex gap-1.5 flex-wrap">
            {DAILY_REQUIRED_WORDS.map((word) => (
              <span
                key={word}
                className="bg-zinc-800 text-zinc-300 text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full"
              >
                {word}
              </span>
            ))}
          </div>
        </div>

        {/* Host name */}
        <section>
          <h2 className="text-xs font-semibold tracking-widest uppercase text-zinc-500 mb-3">
            Your Name
          </h2>
          <input
            type="text"
            value={hostNickname}
            onChange={(e) => setHostNickname(e.target.value)}
            placeholder="e.g. Grayson"
            maxLength={20}
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter" && canCreate) handleCreate(); }}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-4 text-white placeholder-zinc-600 text-lg font-semibold focus:outline-none focus:border-amber-400 transition-colors"
          />
          <p className="text-xs text-zinc-600 mt-2">
            This is how you&apos;ll appear in the room.
          </p>
        </section>

        {/* Bar count */}
        <section>
          <h2 className="text-xs font-semibold tracking-widest uppercase text-zinc-500 mb-3">
            Difficulty
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {DAILY_MODES.map((mode) => (
              <button
                key={mode.barCount}
                type="button"
                onClick={() => setBarCount(mode.barCount)}
                className={cn(
                  "py-3 px-2 rounded-xl border font-bold text-sm transition-all flex flex-col items-center gap-0.5",
                  barCount === mode.barCount
                    ? "border-amber-400 bg-amber-400/10 text-amber-400"
                    : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700"
                )}
              >
                <span className="text-base font-black">{mode.barCount}</span>
                <span className="text-[10px] uppercase tracking-wide">{mode.sublabel}</span>
              </button>
            ))}
          </div>
          {selectedMode && (
            <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
              {selectedMode.description} Rhyme scheme: <span className="text-zinc-300 font-semibold">{selectedMode.scheme}</span>
            </p>
          )}
        </section>

        {error && (
          <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleCreate}
          disabled={isLoading || !canCreate}
          className="w-full bg-amber-400 text-zinc-950 font-black text-lg py-4 rounded-2xl hover:bg-amber-300 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading
            ? "Creating room..."
            : canCreate
            ? "Create Room →"
            : "Enter your name to continue"}
        </button>
      </div>
    </main>
  );
}

export default function CreateRoomPage() {
  return (
    <Suspense>
      <CreateRoomForm />
    </Suspense>
  );
}
