"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { BeatPlayer } from "@/components/beat-player";
import { ChallengeCard } from "@/components/challenge-card";
import { LyricCanvasEditor } from "@/components/lyric-canvas-editor";
import { HighlightLegend } from "@/components/highlight-legend";
import type { RoomStateDTO } from "@/lib/types";
import { getRoomUrl, cn } from "@/lib/utils";

const POLL_INTERVAL_MS = 4000;

export default function RoomPage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const [roomState, setRoomState] = useState<RoomStateDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Session state — set either by the join flow or auto-detected from cookie on load
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [hasJoined, setHasJoined] = useState(false);

  // Join form state
  const [nickname, setNickname] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  // Writing state — stored as a single string, split to lines on submit
  const [lyricsText, setLyricsText] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  // Voting state
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [isVoting, setIsVoting] = useState(false);

  // Share UI state
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load room");
    } finally {
      setIsLoading(false);
    }
  }, [roomCode]);

  useEffect(() => { fetchRoom(); }, [fetchRoom]);

  useEffect(() => {
    const interval = setInterval(fetchRoom, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchRoom]);

  // Auto-detect already-joined state from the server's cookie check
  // This fires when the host lands after creating, or when any participant refreshes
  useEffect(() => {
    if (roomState?.currentParticipantId && !hasJoined) {
      setHasJoined(true);
      setParticipantId(roomState.currentParticipantId);
    }
  }, [roomState?.currentParticipantId, hasJoined]);

  // Hydrate submitted state from server — prevents submitted state resetting on refresh
  useEffect(() => {
    if (roomState?.currentParticipantHasSubmitted && !hasSubmitted) {
      setHasSubmitted(true);
    }
  }, [roomState?.currentParticipantHasSubmitted, hasSubmitted]);

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

  async function handleStart() {
    setIsStarting(true);
    try {
      const res = await fetch(`/api/rooms/${roomCode}/start`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to start game");
      }
      await fetchRoom();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start game");
    } finally {
      setIsStarting(false);
    }
  }

  async function handleSubmit() {
    const lines = lyricsText
      .split("\n")
      .map((l) => l.trimEnd())
      .filter((l) => l.trim().length > 0);
    if (lines.length === 0) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/rooms/${roomCode}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines }),
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
        await navigator.share({ title: "Rhyzzle — join my room!", url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // User dismissed share sheet or clipboard unavailable
    }
  }

  // ── Loading / Error states ─────────────────────────────────────────────────

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
          <Link href="/" className="block bg-amber-400 text-zinc-950 font-black py-3 rounded-xl">
            Create Your Own
          </Link>
        </div>
      </div>
    );
  }

  if (!roomState) return null;

  const { status, beat, challenge, participants, submittedCount, totalCount, isHost } = roomState;

  // Derive current participant's nickname from the participant list
  const myNickname = participantId
    ? participants.find((p) => p.id === participantId)?.nickname ?? null
    : null;

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

        {/* ── LOBBY: Guest Join Form (not yet in room) ──────────────────────── */}
        {status === "LOBBY" && !hasJoined && (
          <GuestJoinView
            nickname={nickname}
            setNickname={setNickname}
            onJoin={handleJoin}
            isJoining={isJoining}
            participants={participants}
            beatTitle={beat.title}
            challengeTitle={challenge.title}
          />
        )}

        {/* ── LOBBY: In-room lobby (host + joined guests) ───────────────────── */}
        {status === "LOBBY" && hasJoined && (
          <LobbyView
            roomCode={roomCode}
            participants={participants}
            isHost={isHost}
            myNickname={myNickname}
            beat={beat}
            challenge={challenge}
            onShare={handleShare}
            copied={copied}
            onStart={handleStart}
            isStarting={isStarting}
          />
        )}

        {/* ── WRITING ───────────────────────────────────────────────────────── */}
        {status === "WRITING" && (
          <WritingView
            beat={beat}
            challenge={challenge}
            lyricsText={lyricsText}
            setLyricsText={setLyricsText}
            hasSubmitted={hasSubmitted}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit}
            submittedCount={submittedCount}
            totalCount={totalCount}
          />
        )}

        {/* ── VOTING ────────────────────────────────────────────────────────── */}
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

        {/* ── REVEAL ────────────────────────────────────────────────────────── */}
        {status === "REVEAL" && (
          <RevealView
            submissions={roomState.submissions ?? []}
            onShare={handleShare}
            copied={copied}
          />
        )}

        {/* ── CLOSED ────────────────────────────────────────────────────────── */}
        {status === "CLOSED" && (
          <div className="text-center py-16">
            <div className="text-4xl mb-4">🏁</div>
            <h2 className="font-black text-xl mb-2">Room Closed</h2>
            <p className="text-zinc-500 text-sm mb-8">This room has ended.</p>
            <Link href="/create" className="block bg-amber-400 text-zinc-950 font-black py-4 rounded-2xl">
              Start a New Room
            </Link>
          </div>
        )}

        {error && (
          <div className="mt-4 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}

// ── Sub-views ─────────────────────────────────────────────────────────────────

function RoomStatusBadge({ status }: { status: string }) {
  const config = {
    LOBBY:   { label: "Lobby",   color: "text-zinc-400 bg-zinc-900" },
    WRITING: { label: "Writing", color: "text-amber-400 bg-amber-400/10" },
    VOTING:  { label: "Voting",  color: "text-blue-400 bg-blue-400/10" },
    REVEAL:  { label: "Reveal",  color: "text-green-400 bg-green-400/10" },
    CLOSED:  { label: "Closed",  color: "text-zinc-600 bg-zinc-900" },
  }[status] ?? { label: status, color: "text-zinc-400 bg-zinc-900" };

  return (
    <span className={cn("text-xs font-semibold px-2 py-1 rounded-full", config.color)}>
      {config.label}
    </span>
  );
}

// Shown to guests who haven't joined yet
function GuestJoinView({
  nickname,
  setNickname,
  onJoin,
  isJoining,
  participants,
  beatTitle,
  challengeTitle,
}: {
  nickname: string;
  setNickname: (v: string) => void;
  onJoin: () => void;
  isJoining: boolean;
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
          placeholder="Your name"
          maxLength={20}
          autoFocus
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-4 text-white placeholder-zinc-600 text-lg font-semibold focus:outline-none focus:border-amber-400 transition-colors"
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
              <span key={p.id} className="text-xs bg-zinc-800 text-zinc-300 px-2.5 py-1 rounded-full">
                {p.nickname}{p.isHost ? " 👑" : ""}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Shown to everyone who is in the room (host + joined guests) during LOBBY
function LobbyView({
  roomCode,
  participants,
  isHost,
  myNickname,
  beat,
  challenge,
  onShare,
  copied,
  onStart,
  isStarting,
}: {
  roomCode: string;
  participants: RoomStateDTO["participants"];
  isHost: boolean;
  myNickname: string | null;
  beat: RoomStateDTO["beat"];
  challenge: RoomStateDTO["challenge"];
  onShare: () => void;
  copied: boolean;
  onStart: () => void;
  isStarting: boolean;
}) {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="pt-2">
        {isHost ? (
          <>
            <p className="text-xs text-amber-400 font-semibold uppercase tracking-widest mb-1">
              You&apos;re the host 👑
            </p>
            <h1 className="font-black text-2xl">Waiting for the crew</h1>
            <p className="text-zinc-500 text-sm mt-1">
              Share the link below. Start when everyone&apos;s in.
            </p>
          </>
        ) : (
          <>
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">
              {myNickname ? `You're in as ${myNickname}` : "You're in"}
            </p>
            <h1 className="font-black text-2xl">Waiting to start</h1>
            <p className="text-zinc-500 text-sm mt-1">
              The host will start the game when everyone&apos;s here.
            </p>
          </>
        )}
      </div>

      {/* Share link — prominent for host, visible for guests too */}
      <button
        onClick={onShare}
        className={cn(
          "w-full py-4 rounded-2xl font-bold text-sm transition-all active:scale-95",
          isHost
            ? "bg-amber-400 text-zinc-950 hover:bg-amber-300"
            : "bg-zinc-900 border border-zinc-800 text-white hover:border-zinc-700"
        )}
      >
        {copied
          ? "✓ Link copied!"
          : `🔗 Invite friends — tap to copy link`}
      </button>

      {/* Beat + challenge summary */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Tonight&apos;s game</p>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-zinc-600 text-xs w-16">Beat</span>
            <span className="font-semibold text-sm text-white">{beat.title}</span>
            {beat.bpm && <span className="text-xs text-zinc-600">{beat.bpm} BPM</span>}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-zinc-600 text-xs w-16">Challenge</span>
            <span className="font-semibold text-sm text-white">{challenge.title}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-zinc-600 text-xs w-16">Bars</span>
            <span className="font-semibold text-sm text-white">{challenge.barCount} bars</span>
          </div>
        </div>
      </div>

      {/* Participant list */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">
          Players ({participants.length})
        </p>
        <div className="space-y-2">
          {participants.map((p) => (
            <div key={p.id} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-sm font-bold text-zinc-300">
                {p.nickname.charAt(0).toUpperCase()}
              </div>
              <span className="font-semibold text-sm flex-1">
                {p.nickname}
              </span>
              <div className="flex items-center gap-1.5">
                {p.isHost && (
                  <span className="text-xs text-amber-400 font-semibold">host</span>
                )}
                {p.id === participants.find(x => x.id === p.id)?.id && !p.isHost && (
                  <span className="w-2 h-2 rounded-full bg-green-400" title="Online" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {isHost && (
        <button
          onClick={onStart}
          disabled={isStarting || participants.length < 1}
          className="w-full bg-green-400 text-zinc-950 font-black text-lg py-4 rounded-2xl hover:bg-green-300 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isStarting ? "Starting..." : "Start Game →"}
        </button>
      )}
    </div>
  );
}

function WritingView({
  beat,
  challenge,
  lyricsText,
  setLyricsText,
  hasSubmitted,
  isSubmitting,
  onSubmit,
  submittedCount,
  totalCount,
}: {
  beat: RoomStateDTO["beat"];
  challenge: RoomStateDTO["challenge"];
  lyricsText: string;
  setLyricsText: (text: string) => void;
  hasSubmitted: boolean;
  isSubmitting: boolean;
  onSubmit: () => void;
  submittedCount: number;
  totalCount: number;
}) {
  const { barCount } = challenge;
  const nonEmptyCount = lyricsText
    .split("\n")
    .filter((l) => l.trim().length > 0).length;
  const isValid = nonEmptyCount === barCount;
  const tooMany = nonEmptyCount > barCount;

  let validationNote = "";
  if (nonEmptyCount > 0 && !isValid) {
    if (tooMany) validationNote = `Too many bars — trim to ${barCount}`;
    else validationNote = `${barCount - nonEmptyCount} more bar${barCount - nonEmptyCount !== 1 ? "s" : ""} needed`;
  }

  // ── Waiting / submitted state ────────────────────────────────────────────
  if (hasSubmitted) {
    const pct = totalCount > 0 ? (submittedCount / totalCount) * 100 : 0;
    return (
      <div className="space-y-4">
        {/* Submitted card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
          <div className="text-5xl mb-4">🔥</div>
          <p className="font-black text-xl mb-1 text-white">Bars submitted!</p>
          <p className="text-zinc-500 text-sm mb-5">
            Waiting for the crew... {submittedCount} / {totalCount} done
          </p>
          {/* Progress bar */}
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-zinc-600 mt-3">
            Host will move to voting when everyone&apos;s ready.
          </p>
        </div>

        {/* Beat still visible while waiting */}
        <BeatPlayer beat={beat} />
      </div>
    );
  }

  // ── Writing state ────────────────────────────────────────────────────────
  return (
    <>
      {/* Scrollable content with padding for fixed submit button */}
      <div className="space-y-4 pb-36">
        {/* Phase header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
              Writing Phase
            </span>
          </div>
          <span className="text-xs text-zinc-600 font-mono">
            {submittedCount} / {totalCount} submitted
          </span>
        </div>

        {/* Beat player */}
        <BeatPlayer beat={beat} />

        {/* Challenge rules */}
        <ChallengeCard challenge={challenge} />

        {/* Required word strip (if applicable) */}
        {challenge.requiredWords.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap px-1">
            <span className="text-xs text-zinc-500">Required:</span>
            {challenge.requiredWords.map((rw) => (
              <span
                key={rw.id}
                className="text-xs font-mono font-bold uppercase text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2.5 py-0.5 rounded-full tracking-wide"
              >
                {rw.word}
              </span>
            ))}
          </div>
        )}

        {/* Lyric canvas */}
        <LyricCanvasEditor
          barCount={barCount}
          value={lyricsText}
          onChange={setLyricsText}
          disabled={isSubmitting}
        />

        {/* Highlight color legend */}
        <HighlightLegend />
      </div>

      {/* Fixed sticky submit button */}
      <div className="fixed bottom-0 inset-x-0 z-50 pointer-events-none">
        <div
          className="max-w-sm mx-auto px-5 pb-7 pt-6 pointer-events-auto"
          style={{
            background:
              "linear-gradient(to top, rgb(9,9,11) 60%, rgba(9,9,11,0.85) 85%, transparent 100%)",
          }}
        >
          {validationNote && (
            <p className="text-xs text-amber-400 text-center mb-2">
              {validationNote}
            </p>
          )}
          <button
            onClick={onSubmit}
            disabled={!isValid || isSubmitting}
            className={cn(
              "w-full font-black text-lg py-4 rounded-2xl transition-all active:scale-95",
              "bg-gradient-to-r from-violet-600 to-purple-600 text-white",
              "hover:from-violet-500 hover:to-purple-500",
              "shadow-lg shadow-violet-900/50",
              "disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 disabled:shadow-none"
            )}
          >
            {isSubmitting ? "Submitting..." : "Submit Bars 🔥"}
          </button>
          <p className="text-xs text-zinc-600 text-center mt-2">
            You can&apos;t change your bars after submitting
          </p>
        </div>
      </div>
    </>
  );
}

function VotingView({
  submissions, selectedId, setSelectedId, hasVoted, isVoting, onVote,
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
        <p className="text-zinc-500 text-sm mt-1">Who cooked? Tap to select, then vote.</p>
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
              <div className="mt-3 text-xs text-amber-400 font-semibold">✓ Selected</div>
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
  submissions, onShare, copied,
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
        <h2 className="font-black text-2xl">{winner?.nickname ?? "???"} cooked</h2>
        <p className="text-zinc-500 text-sm mt-1">
          {winner?.voteCount ?? 0} vote{winner?.voteCount !== 1 ? "s" : ""}
        </p>
      </div>
      {winner && (
        <div className="bg-amber-400/10 border border-amber-400/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-amber-400 text-xs font-bold uppercase tracking-widest">Winner</span>
            <span className="text-amber-400 font-black">{winner.nickname}</span>
          </div>
          <div className="space-y-1.5">
            {winner.lines.map((line) => (
              <p key={line.id} className="text-sm text-zinc-100 leading-relaxed">{line.text}</p>
            ))}
          </div>
        </div>
      )}
      <div className="space-y-3">
        {sorted.slice(1).map((sub, i) => (
          <div key={sub.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-sm">#{i + 2} {sub.nickname}</span>
              <span className="text-xs text-zinc-500">{sub.voteCount} vote{sub.voteCount !== 1 ? "s" : ""}</span>
            </div>
            <div className="space-y-1">
              {sub.lines.map((line) => (
                <p key={line.id} className="text-xs text-zinc-400 leading-relaxed">{line.text}</p>
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
        <a href="/create" className="bg-amber-400 text-zinc-950 font-black py-3 rounded-xl text-center text-sm hover:bg-amber-300 transition-all">
          New Room
        </a>
      </div>
    </div>
  );
}
