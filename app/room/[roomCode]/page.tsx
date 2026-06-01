"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { BeatPlayer } from "@/components/beat-player";
import { BarEditor } from "@/components/bar-editor";
import { ChallengeCard } from "@/components/challenge-card";
import type { RoomStateDTO } from "@/lib/types";
import { getRoomUrl, cn } from "@/lib/utils";

const POLL_INTERVAL_MS = 4000;

export default function RoomPage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const [roomState, setRoomState] = useState<RoomStateDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Guest session state
  const [nickname, setNickname] = useState("");
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  // Writing state
  const [bars, setBars] = useState<string[]>([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Voting state
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [isVoting, setIsVoting] = useState(false);

  // Share state
  const [copied, setCopied] = useState(false);

  const fetchRoom = useCallback(async () => {
    try {
      const res = await fetch(`/api/rooms/${roomCode}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Room not found");
      }
      const data: RoomStateDTO = await res.json();
      setRoomState(data);
      setError(null);
      // Initialize bars array to correct length when entering writing phase
      if (data.status === "WRITING" && bars.length === 0) {
        setBars(Array(data.challenge.barCount).fill(""));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load room");
    } finally {
      setIsLoading(false);
    }
  }, [roomCode, bars.length]);

  // Initial load
  useEffect(() => {
    fetchRoom();
  }, [fetchRoom]);

  // Polling
  useEffect(() => {
    const interval = setInterval(fetchRoom, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchRoom]);

  async function handleJoin() {
    if (!nickname.trim()) return;
    setIsJoining(true);
    try {
      const res = await fetch(`/api/rooms/${roomCode}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: nickname.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to join");
      }
      const data = await res.json();
      setParticipantId(data.participantId);
      setHasJoined(true);
      await fetchRoom();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join room");
    } finally {
      setIsJoining(false);
    }
  }

  async function handleSubmit() {
    const filledBars = bars.filter((b) => b.trim().length > 0);
    if (filledBars.length === 0) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/rooms/${roomCode}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines: bars }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to submit");
      }
      setHasSubmitted(true);
      await fetchRoom();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit bars");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVote() {
    if (!selectedSubmissionId) return;
    setIsVoting(true);
    try {
      const res = await fetch(`/api/rooms/${roomCode}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId: selectedSubmissionId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to vote");
      }
      setHasVoted(true);
      await fetchRoom();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cast vote");
    } finally {
      setIsVoting(false);
    }
  }

  async function handleShare() {
    const url = getRoomUrl(roomCode);
    try {
      if (navigator.share) {
        await navigator.share({ title: "Rhyzzle Room", url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // User cancelled share or clipboard not available
    }
  }

  // ── Render States ──────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl mb-3">🎵</div>
          <p className="text-zinc-500 text-sm">Loading room...</p>
        </div>
      </div>
    );
  }

  if (error && !roomState) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="text-3xl mb-3">💀</div>
          <h1 className="font-black text-xl mb-2">Room not found</h1>
          <p className="text-zinc-500 text-sm mb-6">{error}</p>
          <Link
            href="/"
            className="block bg-amber-400 text-zinc-950 font-black py-3 rounded-xl"
          >
            Create Your Own
          </Link>
        </div>
      </div>
    );
  }

  if (!roomState) return null;

  const { status, beat, challenge, participants, submittedCount, totalCount, isHost } = roomState;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50">
      {/* Nav */}
      <nav className="flex items-center justify-between px-5 py-4 border-b border-zinc-900">
        <Link href="/" className="text-zinc-400 hover:text-white transition-colors text-sm">
          Rhyzzle
        </Link>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-zinc-500 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded-lg">
            {roomCode}
          </span>
          <RoomStatusBadge status={status} />
        </div>
      </nav>

      <div className="max-w-sm mx-auto px-5 py-6">
        {/* ── LOBBY: Join Form ─────────────────────────────────────────────── */}
        {status === "LOBBY" && !hasJoined && (
          <LobbyJoinView
            roomCode={roomCode}
            nickname={nickname}
            setNickname={setNickname}
            onJoin={handleJoin}
            isJoining={isJoining}
            onShare={handleShare}
            copied={copied}
            participants={participants}
            beatTitle={beat.title}
            challengeTitle={challenge.title}
          />
        )}

        {/* ── LOBBY: Waiting (after joined) ────────────────────────────────── */}
        {status === "LOBBY" && hasJoined && (
          <LobbyWaitingView
            participants={participants}
            isHost={isHost}
            onShare={handleShare}
            copied={copied}
            roomCode={roomCode}
          />
        )}

        {/* ── WRITING ──────────────────────────────────────────────────────── */}
        {status === "WRITING" && (
          <WritingView
            beat={beat}
            challenge={challenge}
            bars={bars}
            setBars={setBars}
            hasSubmitted={hasSubmitted}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit}
            submittedCount={submittedCount}
            totalCount={totalCount}
          />
        )}

        {/* ── VOTING ───────────────────────────────────────────────────────── */}
        {status === "VOTING" && (
          <VotingView
            submissions={roomState.submissions ?? []}
            selectedId={selectedSubmissionId}
            setSelectedId={setSelectedSubmissionId}
            hasVoted={hasVoted}
            isVoting={isVoting}
            onVote={handleVote}
          />
        )}

        {/* ── REVEAL ───────────────────────────────────────────────────────── */}
        {status === "REVEAL" && (
          <RevealView
            submissions={roomState.submissions ?? []}
            onShare={handleShare}
            copied={copied}
          />
        )}

        {/* ── CLOSED ───────────────────────────────────────────────────────── */}
        {status === "CLOSED" && (
          <div className="text-center py-16">
            <div className="text-4xl mb-4">🏁</div>
            <h2 className="font-black text-xl mb-2">Room Closed</h2>
            <p className="text-zinc-500 text-sm mb-8">This room has ended.</p>
            <Link
              href="/create"
              className="block bg-amber-400 text-zinc-950 font-black py-4 rounded-2xl"
            >
              Start a New Room
            </Link>
          </div>
        )}

        {/* Error toast */}
        {error && (
          <div className="mt-4 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}

// ── Sub-views ────────────────────────────────────────────────────────────────

function RoomStatusBadge({ status }: { status: string }) {
  const config = {
    LOBBY: { label: "Lobby", color: "text-zinc-400 bg-zinc-900" },
    WRITING: { label: "Writing", color: "text-amber-400 bg-amber-400/10" },
    VOTING: { label: "Voting", color: "text-blue-400 bg-blue-400/10" },
    REVEAL: { label: "Reveal", color: "text-green-400 bg-green-400/10" },
    CLOSED: { label: "Closed", color: "text-zinc-600 bg-zinc-900" },
  }[status] ?? { label: status, color: "text-zinc-400 bg-zinc-900" };

  return (
    <span
      className={cn(
        "text-xs font-semibold px-2 py-1 rounded-full",
        config.color
      )}
    >
      {config.label}
    </span>
  );
}

function LobbyJoinView({
  roomCode,
  nickname,
  setNickname,
  onJoin,
  isJoining,
  onShare,
  copied,
  participants,
  beatTitle,
  challengeTitle,
}: {
  roomCode: string;
  nickname: string;
  setNickname: (v: string) => void;
  onJoin: () => void;
  isJoining: boolean;
  onShare: () => void;
  copied: boolean;
  participants: RoomStateDTO["participants"];
  beatTitle: string;
  challengeTitle: string;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center pt-4">
        <h1 className="font-black text-3xl mb-2">Join the Room</h1>
        <p className="text-zinc-500 text-sm">
          {beatTitle} · {challengeTitle}
        </p>
      </div>

      <div className="space-y-3">
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onJoin()}
          placeholder="Your nickname"
          maxLength={20}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-4 text-white placeholder-zinc-600 text-lg font-semibold focus:outline-none focus:border-amber-400 transition-colors"
          autoFocus
        />
        <button
          onClick={onJoin}
          disabled={isJoining || !nickname.trim()}
          className="w-full bg-amber-400 text-zinc-950 font-black text-lg py-4 rounded-2xl hover:bg-amber-300 active:scale-95 transition-all disabled:opacity-50"
        >
          {isJoining ? "Joining..." : "Join Room →"}
        </button>
      </div>

      {participants.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">
            Already here ({participants.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {participants.map((p) => (
              <span
                key={p.id}
                className="text-xs bg-zinc-800 text-zinc-300 px-2.5 py-1 rounded-full"
              >
                {p.nickname}
                {p.isHost && " 👑"}
              </span>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onShare}
        className="w-full border border-zinc-800 text-zinc-400 font-semibold py-3 rounded-xl hover:border-zinc-700 hover:text-white transition-all text-sm"
      >
        {copied ? "✓ Link copied!" : "Share Room Link"}
      </button>
    </div>
  );
}

function LobbyWaitingView({
  participants,
  isHost,
  onShare,
  copied,
  roomCode,
}: {
  participants: RoomStateDTO["participants"];
  isHost: boolean;
  onShare: () => void;
  copied: boolean;
  roomCode: string;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center pt-4">
        <h1 className="font-black text-2xl mb-2">Waiting for the crew</h1>
        <p className="text-zinc-500 text-sm">Share the link to invite players</p>
      </div>

      <button
        onClick={onShare}
        className="w-full bg-zinc-900 border border-zinc-800 text-white font-bold py-4 rounded-2xl hover:border-zinc-700 active:scale-95 transition-all"
      >
        {copied ? "✓ Copied!" : `🔗 rhyzzle.co/room/${roomCode}`}
      </button>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">
          Players ({participants.length})
        </p>
        <div className="space-y-2">
          {participants.map((p) => (
            <div key={p.id} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm">
                {p.nickname.charAt(0).toUpperCase()}
              </div>
              <span className="font-semibold text-sm">
                {p.nickname}
                {p.isHost && (
                  <span className="ml-1.5 text-xs text-amber-400">host</span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>

      {isHost && (
        <div className="bg-amber-400/10 border border-amber-400/30 rounded-xl p-4">
          <p className="text-amber-400 text-sm font-semibold mb-1">
            You&apos;re the host
          </p>
          <p className="text-zinc-500 text-xs">
            Start the game when everyone has joined. (Start button coming in Phase 1.)
          </p>
        </div>
      )}
    </div>
  );
}

function WritingView({
  beat,
  challenge,
  bars,
  setBars,
  hasSubmitted,
  isSubmitting,
  onSubmit,
  submittedCount,
  totalCount,
}: {
  beat: RoomStateDTO["beat"];
  challenge: RoomStateDTO["challenge"];
  bars: string[];
  setBars: (bars: string[]) => void;
  hasSubmitted: boolean;
  isSubmitting: boolean;
  onSubmit: () => void;
  submittedCount: number;
  totalCount: number;
}) {
  return (
    <div className="space-y-5">
      {/* Progress */}
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>Writing Phase</span>
        <span>{submittedCount} / {totalCount} submitted</span>
      </div>

      {/* Beat Player */}
      <BeatPlayer beat={beat} />

      {/* Challenge Card */}
      <ChallengeCard challenge={challenge} />

      {/* Bar Editor */}
      {!hasSubmitted ? (
        <div className="space-y-4">
          <BarEditor
            barCount={challenge.barCount}
            bars={bars}
            onChange={setBars}
          />
          <button
            onClick={onSubmit}
            disabled={isSubmitting || bars.every((b) => !b.trim())}
            className="w-full bg-amber-400 text-zinc-950 font-black text-lg py-4 rounded-2xl hover:bg-amber-300 active:scale-95 transition-all disabled:opacity-50"
          >
            {isSubmitting ? "Submitting..." : "Submit Bars 🔥"}
          </button>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
          <div className="text-3xl mb-3">🔥</div>
          <p className="font-black text-lg mb-1">Bars submitted!</p>
          <p className="text-zinc-500 text-sm">
            Waiting for others... ({submittedCount} / {totalCount})
          </p>
        </div>
      )}
    </div>
  );
}

function VotingView({
  submissions,
  selectedId,
  setSelectedId,
  hasVoted,
  isVoting,
  onVote,
}: {
  submissions: NonNullable<RoomStateDTO["submissions"]>;
  selectedId: string | null;
  setSelectedId: (id: string) => void;
  hasVoted: boolean;
  isVoting: boolean;
  onVote: () => void;
}) {
  if (hasVoted) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-4">✓</div>
        <h2 className="font-black text-xl mb-2">Vote cast!</h2>
        <p className="text-zinc-500 text-sm">Waiting for everyone to vote...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="text-center pt-2">
        <h2 className="font-black text-2xl">Vote</h2>
        <p className="text-zinc-500 text-sm mt-1">
          Who cooked? Tap to select, then vote.
        </p>
      </div>

      <div className="space-y-3">
        {submissions.map((sub) => (
          <button
            key={sub.id}
            onClick={() => setSelectedId(sub.id)}
            className={cn(
              "w-full text-left p-4 rounded-xl border transition-all",
              selectedId === sub.id
                ? "border-amber-400 bg-amber-400/10"
                : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
            )}
          >
            <div className="space-y-1.5">
              {sub.lines.map((line) => (
                <p key={line.id} className="text-sm text-zinc-200 leading-relaxed">
                  {line.text || <span className="text-zinc-600 italic">empty line</span>}
                </p>
              ))}
            </div>
            {selectedId === sub.id && (
              <div className="mt-3 text-xs text-amber-400 font-semibold">
                ✓ Selected
              </div>
            )}
          </button>
        ))}
      </div>

      <button
        onClick={onVote}
        disabled={!selectedId || isVoting}
        className="w-full bg-amber-400 text-zinc-950 font-black text-lg py-4 rounded-2xl hover:bg-amber-300 active:scale-95 transition-all disabled:opacity-50"
      >
        {isVoting ? "Voting..." : "Cast Vote"}
      </button>
    </div>
  );
}

function RevealView({
  submissions,
  onShare,
  copied,
}: {
  submissions: NonNullable<RoomStateDTO["submissions"]>;
  onShare: () => void;
  copied: boolean;
}) {
  const sorted = [...submissions].sort((a, b) => b.voteCount - a.voteCount);
  const winner = sorted[0];

  return (
    <div className="space-y-5">
      <div className="text-center pt-2">
        <div className="text-4xl mb-3">👑</div>
        <h2 className="font-black text-2xl">
          {winner?.nickname ?? "???"} cooked
        </h2>
        <p className="text-zinc-500 text-sm mt-1">
          {winner?.voteCount ?? 0} vote{winner?.voteCount !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Winner's bars */}
      {winner && (
        <div className="bg-amber-400/10 border border-amber-400/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-amber-400 text-xs font-bold uppercase tracking-widest">
              Winner
            </span>
            <span className="text-amber-400 font-black">{winner.nickname}</span>
          </div>
          <div className="space-y-1.5">
            {winner.lines.map((line) => (
              <p key={line.id} className="text-sm text-zinc-100 leading-relaxed">
                {line.text}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* All results */}
      <div className="space-y-3">
        {sorted.slice(1).map((sub, i) => (
          <div
            key={sub.id}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-sm">
                #{i + 2} {sub.nickname}
              </span>
              <span className="text-xs text-zinc-500">
                {sub.voteCount} vote{sub.voteCount !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="space-y-1">
              {sub.lines.map((line) => (
                <p key={line.id} className="text-xs text-zinc-400 leading-relaxed">
                  {line.text}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onShare}
          className="border border-zinc-800 text-zinc-300 font-semibold py-3 rounded-xl hover:border-zinc-700 transition-all text-sm"
        >
          {copied ? "✓ Copied!" : "Share Results"}
        </button>
        <a
          href="/create"
          className="bg-amber-400 text-zinc-950 font-black py-3 rounded-xl text-center text-sm hover:bg-amber-300 transition-all"
        >
          New Room
        </a>
      </div>
    </div>
  );
}
