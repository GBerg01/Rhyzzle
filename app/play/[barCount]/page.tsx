"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  DAILY_BEAT,
  DAILY_TITLE,
  DAILY_PROMPT,
  getDailyVariant,
  variantToChallengeDTO,
} from "@/lib/daily-challenge";
import type { DailyBarCount } from "@/lib/daily-challenge";
import { BeatPlayer } from "@/components/beat-player";
import { LyricPuzzleCanvas } from "@/components/lyric-puzzle-canvas";
import { cn } from "@/lib/utils";
import type { BeatDTO } from "@/lib/types";

// DAILY_BEAT is structurally compatible with BeatDTO (string ⊂ string | null)
const BEAT_DTO = DAILY_BEAT as unknown as BeatDTO;

const VALID_BAR_COUNTS: DailyBarCount[] = [3, 6, 8];

export default function DailyPlayPage() {
  const { barCount: barCountParam } = useParams<{ barCount: string }>();
  const router = useRouter();

  const barCount = Number(barCountParam) as DailyBarCount;
  const isValid = VALID_BAR_COUNTS.includes(barCount);

  const [phase, setPhase] = useState<"writing" | "submitted">("writing");
  const [barLines, setBarLines] = useState<string[]>(() =>
    Array(isValid ? barCount : 6).fill("")
  );
  const [displayName, setDisplayName] = useState("");
  const [isCreatingChallenge, setIsCreatingChallenge] = useState(false);
  const [challengeError, setChallengeError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isValid) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-6 text-zinc-50">
        <div className="text-center">
          <p className="text-zinc-400 mb-4">Invalid bar count. Choose 3, 6, or 8 bars.</p>
          <Link href="/play" className="text-amber-400 font-semibold hover:text-amber-300">
            ← Pick a mode
          </Link>
        </div>
      </div>
    );
  }

  const variant = getDailyVariant(barCount);
  const challenge = variantToChallengeDTO(variant);
  const filledCount = barLines.filter((l) => l.trim().length > 0).length;
  const allFilled = filledCount === barCount;

  function handleLineChange(index: number, value: string) {
    setBarLines((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function handleSubmit() {
    if (!allFilled) return;
    setPhase("submitted");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleChallengeFriends() {
    const name = displayName.trim();
    if (!name) return;
    setIsCreatingChallenge(true);
    setChallengeError(null);

    try {
      const submittedBars = barLines.map((l) => l.trimEnd()).filter((l) => l.trim().length > 0);
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostNickname: name,
          source: "CHALLENGE_LINK",
          barCount,
          submittedBars,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to create challenge link");
      }

      const { roomCode } = await res.json();
      router.push(`/room/${roomCode}`);
    } catch (err) {
      setChallengeError(err instanceof Error ? err.message : "Something went wrong");
      setIsCreatingChallenge(false);
    }
  }

  async function handleCopyResult() {
    const submittedLines = barLines.filter((l) => l.trim());
    const origin = typeof window !== "undefined" ? window.location.origin : "https://rhyzzle.com";
    const text = [
      `I finished today's Rhyzzle 🎤`,
      `${DAILY_TITLE} · ${barCount} Bars`,
      ``,
      ...submittedLines.map((l) => l.trim()),
      ``,
      `Try it: ${origin}/play/${barCount}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // clipboard unavailable — fail silently
    }
  }

  // ── Writing phase ──────────────────────────────────────────────────────────

  if (phase === "writing") {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-50">
        {/* Nav */}
        <nav className="flex items-center gap-4 px-5 py-4 border-b border-zinc-900 sticky top-0 z-10 bg-zinc-950">
          <Link href="/play" className="text-zinc-400 hover:text-white transition-colors text-lg">
            ←
          </Link>
          <div className="flex-1 min-w-0">
            <span className="font-black text-white text-sm">{DAILY_TITLE}</span>
            <span className="text-zinc-600 text-xs ml-2">· {barCount} bars</span>
          </div>
          <span className="text-xs text-zinc-600 font-mono bg-zinc-900 border border-zinc-800 px-2 py-1 rounded-lg flex-shrink-0">
            {filledCount}/{barCount}
          </span>
        </nav>

        <div className="max-w-sm mx-auto px-5 pt-5 pb-36 space-y-4">
          {/* Prompt */}
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
            <span className="text-xs font-semibold text-zinc-400 leading-snug">{DAILY_PROMPT}</span>
          </div>

          {/* Beat player */}
          <BeatPlayer beat={BEAT_DTO} />

          {/* Puzzle canvas */}
          <LyricPuzzleCanvas
            challenge={challenge}
            lines={barLines}
            onLineChange={handleLineChange}
          />
        </div>

        {/* Sticky submit */}
        <div className="fixed bottom-0 inset-x-0 z-50 pointer-events-none">
          <div
            className="max-w-sm mx-auto px-5 pb-7 pt-6 pointer-events-auto"
            style={{
              background:
                "linear-gradient(to top, rgb(9,9,11) 60%, rgba(9,9,11,0.85) 85%, transparent 100%)",
            }}
          >
            {!allFilled && filledCount > 0 && (
              <p className="text-xs text-amber-400 text-center mb-2">
                {barCount - filledCount} more bar
                {barCount - filledCount !== 1 ? "s" : ""} needed
              </p>
            )}
            <button
              onClick={handleSubmit}
              disabled={!allFilled}
              className={cn(
                "w-full font-black text-lg py-4 rounded-2xl transition-all active:scale-95",
                "bg-gradient-to-r from-violet-600 to-purple-600 text-white",
                "hover:from-violet-500 hover:to-purple-500",
                "shadow-lg shadow-violet-900/50",
                "disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 disabled:shadow-none"
              )}
            >
              Submit Bars 🔥
            </button>
            <p className="text-xs text-zinc-600 text-center mt-2">
              You can&apos;t change your bars after submitting
            </p>
          </div>
        </div>
      </main>
    );
  }

  // ── Post-submit screen ─────────────────────────────────────────────────────

  const submittedLines = barLines.filter((l) => l.trim());

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50">
      <nav className="flex items-center px-5 py-4 border-b border-zinc-900">
        <span className="font-black text-white">Rhyzzle</span>
      </nav>

      <div className="max-w-sm mx-auto px-5 py-8 space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="text-5xl mb-3">🔥</div>
          <h1 className="font-black text-3xl mb-1">Bars submitted.</h1>
          <p className="text-zinc-500 text-sm">{DAILY_TITLE} · {barCount} Bars</p>
        </div>

        {/* Submitted bars preview */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-3">
            Your bars
          </p>
          <div className="space-y-2">
            {submittedLines.map((line, i) => (
              <p key={i} className="text-zinc-100 text-sm leading-relaxed">
                {line.trim()}
              </p>
            ))}
          </div>
        </div>

        {/* Name input — needed to create challenge link */}
        <div>
          <label className="text-xs font-black uppercase tracking-widest text-zinc-500 block mb-2">
            Your name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && displayName.trim()) handleChallengeFriends();
            }}
            placeholder="e.g. Grayson"
            maxLength={20}
            autoFocus
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3.5 text-white placeholder-zinc-600 text-base font-semibold focus:outline-none focus:border-amber-400 transition-colors"
          />
          <p className="text-xs text-zinc-600 mt-1.5">Used when you challenge friends.</p>
        </div>

        {challengeError && (
          <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
            {challengeError}
          </p>
        )}

        {/* Primary: Challenge Friends */}
        <div className="space-y-2">
          <button
            onClick={handleChallengeFriends}
            disabled={!displayName.trim() || isCreatingChallenge}
            className={cn(
              "w-full font-black text-lg py-4 rounded-2xl transition-all active:scale-95",
              "bg-amber-400 text-zinc-950 hover:bg-amber-300",
              "disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
            )}
          >
            {isCreatingChallenge ? "Creating challenge link..." : "Challenge Friends →"}
          </button>
          <p className="text-zinc-500 text-xs text-center leading-relaxed">
            {displayName.trim()
              ? "Creates a shareable link. Friends write their bars. Vote who cooked."
              : "Enter your name above to challenge friends."}
          </p>
        </div>

        {/* Secondary actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleCopyResult}
            className="border border-zinc-800 text-zinc-300 font-semibold text-sm py-3.5 rounded-xl hover:border-zinc-700 hover:text-white transition-all active:scale-95"
          >
            {copied ? "✓ Copied!" : "Copy Result"}
          </button>
          <Link
            href={`/create?barCount=${barCount}`}
            className="border border-zinc-800 text-zinc-300 font-semibold text-sm py-3.5 rounded-xl hover:border-zinc-700 hover:text-white transition-all active:scale-95 text-center"
          >
            Start Group Room
          </Link>
        </div>

        <Link
          href="/"
          className="block text-center text-zinc-600 text-sm hover:text-zinc-400 transition-colors py-1"
        >
          ← Back Home
        </Link>
      </div>
    </main>
  );
}
