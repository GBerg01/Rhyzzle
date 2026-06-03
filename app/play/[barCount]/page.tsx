"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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
import { SubmissionPatternCard } from "@/components/submission-pattern-card";
import { HighlightKey } from "@/components/highlight-key";
import { RhyzzleChecklist } from "@/components/rhyzzle-checklist";
import { cn, copyToClipboard } from "@/lib/utils";
import type { BeatDTO, SubmissionLineDTO } from "@/lib/types";
import { runRuleChecks } from "@/lib/rule-checks/run-rule-checks";
import { CATEGORY_COLOR } from "@/lib/rule-checks/types";

const BEAT_DTO = DAILY_BEAT as unknown as BeatDTO;
const VALID_BAR_COUNTS: DailyBarCount[] = [3, 6, 8];

export default function DailyPlayPage() {
  const { barCount: barCountParam } = useParams<{ barCount: string }>();

  const barCount = Number(barCountParam) as DailyBarCount;
  const isValid = VALID_BAR_COUNTS.includes(barCount);

  const [phase, setPhase] = useState<"writing" | "submitted">("writing");
  const [barLines, setBarLines] = useState<string[]>(() =>
    Array(isValid ? barCount : 6).fill("")
  );
  const [displayName, setDisplayName] = useState("");

  // Challenge Friends state
  const [isCreatingChallenge, setIsCreatingChallenge] = useState(false);
  const [challengeError, setChallengeError] = useState<string | null>(null);
  const [challengeRoomCode, setChallengeRoomCode] = useState<string | null>(null);
  const [challengeLinkCopied, setChallengeLinkCopied] = useState(false);
  const [challengeLinkCopyFailed, setChallengeLinkCopyFailed] = useState(false);

  // Copy Result state
  const [copyResultState, setCopyResultState] = useState<"idle" | "copied" | "fallback">("idle");

  // Preview highlight spans for post-submit card
  const [previewLines, setPreviewLines] = useState<SubmissionLineDTO[] | null>(null);

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

    // Compute highlight spans client-side for the post-submit preview
    try {
      const { allHighlights } = runRuleChecks(barLines, challenge);
      const computed: SubmissionLineDTO[] = barLines.map((text, lineIndex) => ({
        id: `preview-${lineIndex}`,
        lineIndex,
        text: text.trim(),
        highlightSpans: allHighlights
          .filter((s) => s.lineIndex === lineIndex)
          .map((s, spanIdx) => ({
            id: `preview-span-${lineIndex}-${spanIdx}`,
            startIndex: s.startIndex,
            endIndex: s.endIndex,
            category: s.category,
            color: CATEGORY_COLOR[s.category],
            confidence: s.confidence,
            explanation: s.explanation,
          })),
      }));
      setPreviewLines(computed);
    } catch {
      // Non-fatal — preview shows bars without highlights
      setPreviewLines(
        barLines.map((text, lineIndex) => ({
          id: `preview-${lineIndex}`,
          lineIndex,
          text: text.trim(),
          highlightSpans: [],
        })),
      );
    }

    setPhase("submitted");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function buildResultText(): string {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return [
      `I finished today's Rhyzzle 🎤`,
      `${DAILY_TITLE} · ${barCount} Bars`,
      ``,
      ...barLines.filter((l) => l.trim()).map((l) => l.trim()),
      ``,
      `Try it: ${origin}/play/${barCount}`,
    ].join("\n");
  }

  async function handleCopyResult() {
    const text = buildResultText();
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopyResultState("copied");
      setTimeout(() => setCopyResultState("idle"), 2500);
    } else {
      setCopyResultState("fallback");
    }
  }

  async function handleChallengeFriends() {
    const name = displayName.trim();
    if (!name) return;
    setIsCreatingChallenge(true);
    setChallengeError(null);
    setChallengeRoomCode(null);
    setChallengeLinkCopied(false);
    setChallengeLinkCopyFailed(false);

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

      const data = await res.json();
      const code: string = data.roomCode;
      if (!code) throw new Error("No room code returned from server");

      setChallengeRoomCode(code);

      // Try to auto-copy the link immediately
      const url = `${typeof window !== "undefined" ? window.location.origin : ""}/room/${code}`;
      const ok = await copyToClipboard(url);
      if (ok) {
        setChallengeLinkCopied(true);
      } else {
        setChallengeLinkCopyFailed(true);
      }
    } catch (err) {
      setChallengeError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsCreatingChallenge(false);
    }
  }

  async function handleCopyChallengeLink() {
    if (!challengeRoomCode) return;
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/room/${challengeRoomCode}`;
    const ok = await copyToClipboard(url);
    if (ok) {
      setChallengeLinkCopied(true);
      setChallengeLinkCopyFailed(false);
    } else {
      setChallengeLinkCopyFailed(true);
    }
  }

  // ── Writing phase ──────────────────────────────────────────────────────────

  if (phase === "writing") {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-50">
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
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
            <span className="text-xs font-semibold text-zinc-400 leading-snug">{DAILY_PROMPT}</span>
          </div>

          <BeatPlayer beat={BEAT_DTO} />

          <LyricPuzzleCanvas
            challenge={challenge}
            lines={barLines}
            onLineChange={handleLineChange}
          />

          <RhyzzleChecklist lines={barLines} challenge={challenge} />
        </div>

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
  const challengeUrl =
    challengeRoomCode && typeof window !== "undefined"
      ? `${window.location.origin}/room/${challengeRoomCode}`
      : null;

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

        {/* Colorful bars preview with inline highlights */}
        {previewLines && (
          <div>
            <SubmissionPatternCard
              challenge={challenge}
              lines={previewLines}
              label="Your Bars"
            />
            <HighlightKey />
            <p className="text-[10px] text-zinc-600 text-center mt-2 leading-relaxed">
              Rhyzzle checks the pattern, not quality. Humans still vote who cooked.
            </p>
          </div>
        )}

        {/* Challenge Friends flow */}
        {challengeRoomCode ? (
          /* ── Challenge link created — show it in-page ── */
          <div className="space-y-3">
            <div className="bg-green-400/10 border border-green-400/30 rounded-2xl p-4 space-y-3">
              <p className="text-green-400 text-xs font-black uppercase tracking-widest">
                ✓ Challenge link ready
              </p>

              {challengeLinkCopied && (
                <p className="text-green-400 text-sm font-semibold">Copied link.</p>
              )}

              {challengeLinkCopyFailed && (
                <p className="text-zinc-400 text-xs">
                  Couldn&apos;t auto-copy. Press and hold the link below to copy.
                </p>
              )}

              {/* Selectable link */}
              <div className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 select-all cursor-text">
                <p className="text-zinc-200 text-xs font-mono break-all">{challengeUrl}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleCopyChallengeLink}
                  className="border border-zinc-700 text-zinc-300 font-semibold text-sm py-3 rounded-xl hover:border-zinc-600 transition-all active:scale-95"
                >
                  {challengeLinkCopied ? "✓ Copied!" : "Copy Link"}
                </button>
                <Link
                  href={`/room/${challengeRoomCode}`}
                  className="bg-amber-400 text-zinc-950 font-black text-sm py-3 rounded-xl text-center hover:bg-amber-300 transition-all active:scale-95"
                >
                  Open Room →
                </Link>
              </div>
            </div>

            <p className="text-zinc-500 text-xs text-center leading-relaxed">
              Friends write to the same beat and prompt. Everyone ranks who cooked.
            </p>
          </div>
        ) : (
          /* ── Name + Challenge Friends button ── */
          <div className="space-y-4">
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

            {challengeError ? (
              <div className="space-y-3">
                <div className="bg-red-400/10 border border-red-400/20 rounded-xl p-4 space-y-2">
                  <p className="text-sm font-semibold text-red-400">Couldn&apos;t create challenge link</p>
                  <p className="text-sm text-red-300">{challengeError}</p>
                  {process.env.NODE_ENV === "development" && (
                    <p className="text-xs text-zinc-500 pt-2 border-t border-zinc-800">
                      Local dev: if you recently reset the DB, try a fresh incognito window or restart pnpm dev.
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleChallengeFriends}
                    disabled={!displayName.trim() || isCreatingChallenge}
                    className="font-semibold text-sm py-3 rounded-xl bg-zinc-800 text-white hover:bg-zinc-700 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isCreatingChallenge ? "Retrying..." : "Try Again"}
                  </button>
                  <Link
                    href="/play"
                    className="font-semibold text-sm py-3 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white text-center transition-all active:scale-95"
                  >
                    Start Fresh
                  </Link>
                </div>
              </div>
            ) : (
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
                  {isCreatingChallenge ? "Creating link..." : "Challenge Friends →"}
                </button>
                <p className="text-zinc-500 text-xs text-center leading-relaxed">
                  {displayName.trim()
                    ? "Creates a shareable link. Friends write their bars. Vote who cooked."
                    : "Enter your name above to challenge friends."}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Copy Result — with fallback */}
        {copyResultState === "fallback" ? (
          <div className="space-y-2">
            <p className="text-xs text-zinc-400 text-center">
              Couldn&apos;t auto-copy. Select the text below to copy manually.
            </p>
            <textarea
              readOnly
              value={buildResultText()}
              rows={submittedLines.length + 4}
              onFocus={(e) => e.target.select()}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-zinc-200 text-xs font-mono resize-none focus:outline-none focus:border-zinc-600"
            />
            <button
              onClick={() => setCopyResultState("idle")}
              className="text-xs text-zinc-600 text-center w-full hover:text-zinc-400 transition-colors py-1"
            >
              Dismiss
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleCopyResult}
              className="border border-zinc-800 text-zinc-300 font-semibold text-sm py-3.5 rounded-xl hover:border-zinc-700 hover:text-white transition-all active:scale-95"
            >
              {copyResultState === "copied" ? "✓ Copied!" : "Copy Result"}
            </button>
            <Link
              href={`/create?barCount=${barCount}`}
              className="border border-zinc-800 text-zinc-300 font-semibold text-sm py-3.5 rounded-xl hover:border-zinc-700 hover:text-white transition-all active:scale-95 text-center"
            >
              Start Group Room
            </Link>
          </div>
        )}

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
