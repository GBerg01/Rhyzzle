"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SAMPLE_BEATS, SAMPLE_CHALLENGES } from "@/lib/sample-data";
import { cn } from "@/lib/utils";

const BAR_COUNTS = [4, 6, 8] as const;

export default function CreateRoomPage() {
  const router = useRouter();
  const [hostNickname, setHostNickname] = useState("");
  const [selectedBeat, setSelectedBeat] = useState(SAMPLE_BEATS[0].id);
  const [barCount, setBarCount] = useState<4 | 6 | 8>(4);
  const [selectedChallenge, setSelectedChallenge] = useState(
    SAMPLE_CHALLENGES[0].id
  );
  const [privacy, setPrivacy] = useState<"PRIVATE" | "PUBLIC">("PRIVATE");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matchingChallenges = SAMPLE_CHALLENGES.filter(
    (c) => c.barCount === barCount
  );

  const selectedBeatData = SAMPLE_BEATS.find((b) => b.id === selectedBeat);
  const selectedChallengeData = SAMPLE_CHALLENGES.find(
    (c) => c.id === selectedChallenge
  );

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
          beatId: selectedBeat,
          challengeId: selectedChallenge,
          privacy,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to create room");
      }

      const { roomCode } = await res.json();
      // Cookies are already set by the API response — redirect straight into the room
      router.push(`/room/${roomCode}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50">
      {/* Nav */}
      <nav className="flex items-center gap-4 px-5 py-4 border-b border-zinc-900">
        <Link href="/" className="text-zinc-400 hover:text-white transition-colors">
          ←
        </Link>
        <span className="font-black text-white">Create Room</span>
      </nav>

      <div className="max-w-sm mx-auto px-5 py-8 space-y-8">

        {/* Host Nickname — first and most prominent */}
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
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-4 text-white placeholder-zinc-600 text-lg font-semibold focus:outline-none focus:border-amber-400 transition-colors"
          />
          <p className="text-xs text-zinc-600 mt-2">
            This is how you&apos;ll appear in the room.
          </p>
        </section>

        {/* Beat Selection */}
        <section>
          <h2 className="text-xs font-semibold tracking-widest uppercase text-zinc-500 mb-3">
            Pick a Beat
          </h2>
          <div className="space-y-2">
            {SAMPLE_BEATS.map((beat) => (
              <button
                key={beat.id}
                onClick={() => setSelectedBeat(beat.id)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
                  selectedBeat === beat.id
                    ? "border-amber-400 bg-amber-400/10"
                    : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
                )}
              >
                <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-lg flex-shrink-0">
                  🎵
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-white truncate">
                    {beat.title}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {beat.genre} · {beat.bpm} BPM
                  </p>
                </div>
                {selectedBeat === beat.id && (
                  <span className="text-amber-400 text-sm">✓</span>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Bar Count */}
        <section>
          <h2 className="text-xs font-semibold tracking-widest uppercase text-zinc-500 mb-3">
            Bar Count
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {BAR_COUNTS.map((count) => (
              <button
                key={count}
                onClick={() => {
                  setBarCount(count);
                  const first = SAMPLE_CHALLENGES.find((c) => c.barCount === count);
                  if (first) setSelectedChallenge(first.id);
                }}
                className={cn(
                  "py-3 rounded-xl border font-bold text-sm transition-all",
                  barCount === count
                    ? "border-amber-400 bg-amber-400/10 text-amber-400"
                    : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700"
                )}
              >
                {count} Bars
              </button>
            ))}
          </div>
        </section>

        {/* Challenge Rules */}
        <section>
          <h2 className="text-xs font-semibold tracking-widest uppercase text-zinc-500 mb-3">
            Challenge
          </h2>
          <div className="space-y-2">
            {matchingChallenges.map((challenge) => (
              <button
                key={challenge.id}
                onClick={() => setSelectedChallenge(challenge.id)}
                className={cn(
                  "w-full p-3 rounded-xl border text-left transition-all",
                  selectedChallenge === challenge.id
                    ? "border-amber-400 bg-amber-400/10"
                    : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-sm text-white">
                    {challenge.title}
                  </p>
                  {selectedChallenge === challenge.id && (
                    <span className="text-amber-400 text-sm">✓</span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  {challenge.description}
                </p>
              </button>
            ))}
          </div>
        </section>

        {/* Privacy */}
        <section>
          <h2 className="text-xs font-semibold tracking-widest uppercase text-zinc-500 mb-3">
            Privacy
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {(["PRIVATE", "PUBLIC"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPrivacy(p)}
                className={cn(
                  "py-3 rounded-xl border font-semibold text-sm transition-all",
                  privacy === p
                    ? "border-amber-400 bg-amber-400/10 text-amber-400"
                    : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700"
                )}
              >
                {p === "PRIVATE" ? "🔒 Private" : "🌐 Public"}
              </button>
            ))}
          </div>
          <p className="text-xs text-zinc-600 mt-2">
            {privacy === "PRIVATE"
              ? "Only people with the link can join."
              : "Anyone can find and join this room."}
          </p>
        </section>

        {/* Summary */}
        {selectedBeatData && selectedChallengeData && (
          <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
              Room Summary
            </h3>
            <div className="space-y-1.5 text-sm">
              {hostNickname.trim() && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">Host</span>
                  <span className="text-amber-400 font-semibold">
                    {hostNickname.trim()} 👑
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-zinc-500">Beat</span>
                <span className="text-zinc-100 font-medium">
                  {selectedBeatData.title}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Bars</span>
                <span className="text-zinc-100 font-medium">{barCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Challenge</span>
                <span className="text-zinc-100 font-medium">
                  {selectedChallengeData.title}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Privacy</span>
                <span className="text-zinc-100 font-medium">{privacy}</span>
              </div>
            </div>
          </section>
        )}

        {error && (
          <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        <button
          onClick={handleCreate}
          disabled={isLoading || !canCreate}
          className="w-full bg-amber-400 text-zinc-950 font-black text-lg py-4 rounded-2xl hover:bg-amber-300 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Creating..." : canCreate ? "Create Room →" : "Enter your name to continue"}
        </button>
      </div>
    </main>
  );
}
