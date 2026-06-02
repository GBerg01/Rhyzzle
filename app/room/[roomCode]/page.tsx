"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { BeatPlayer } from "@/components/beat-player";
import { LyricPuzzleCanvas } from "@/components/lyric-puzzle-canvas";
import { SubmissionPatternCard } from "@/components/submission-pattern-card";
import type { RoomStateDTO, SubmissionDTO } from "@/lib/types";
import { getRoomUrl, copyToClipboard, cn } from "@/lib/utils";

const POLL_INTERVAL_MS = 4000;

function formatLockTime(locksAt: string): string {
  const d = new Date(locksAt);
  const h = d.getHours();
  const m = d.getMinutes();
  const period = h >= 12 ? "PM" : "AM";
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  if (m === 0) return `${hour} ${period}`;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

export default function RoomPage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const [roomState, setRoomState] = useState<RoomStateDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [participantId, setParticipantId] = useState<string | null>(null);
  const [hasJoined, setHasJoined] = useState(false);

  const [nickname, setNickname] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const [barLines, setBarLines] = useState<string[]>([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  // Ranked-choice voting state — rankedIds[0] = 1st pick, rankedIds[1] = 2nd pick, etc.
  const [rankedIds, setRankedIds] = useState<string[]>([]);
  const [hasRanked, setHasRanked] = useState(false);
  const [isSubmittingRanking, setIsSubmittingRanking] = useState(false);
  const [isStartingVoting, setIsStartingVoting] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);

  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

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

  useEffect(() => {
    if (roomState?.currentParticipantId && !hasJoined) {
      setHasJoined(true);
      setParticipantId(roomState.currentParticipantId);
    }
  }, [roomState?.currentParticipantId, hasJoined]);

  useEffect(() => {
    if (roomState?.currentParticipantHasSubmitted && !hasSubmitted) {
      setHasSubmitted(true);
    }
  }, [roomState?.currentParticipantHasSubmitted, hasSubmitted]);

  useEffect(() => {
    if (roomState?.currentParticipantHasVoted && !hasRanked) {
      setHasRanked(true);
    }
  }, [roomState?.currentParticipantHasVoted, hasRanked]);

  // Hydrate ranked IDs from server on load/refresh (allows CHALLENGE_LINK re-ranking)
  useEffect(() => {
    const serverRankings = roomState?.currentParticipantRankings ?? [];
    if (serverRankings.length > 0 && rankedIds.length === 0) {
      setRankedIds(
        [...serverRankings]
          .sort((a, b) => a.rankPosition - b.rankPosition)
          .map((r) => r.submissionId),
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomState?.currentParticipantRankings?.length]);

  useEffect(() => {
    if (roomState?.status === "WRITING" && hasJoined && barLines.length === 0 && roomState.challenge) {
      setBarLines(Array(roomState.challenge.barCount).fill(""));
    }
  }, [roomState?.status, roomState?.challenge?.barCount, barLines.length, hasJoined]);

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

  async function handleStartVoting() {
    setIsStartingVoting(true);
    try {
      const res = await fetch(`/api/rooms/${roomCode}/start-voting`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to start voting");
      }
      await fetchRoom();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start voting");
    } finally {
      setIsStartingVoting(false);
    }
  }

  async function handleReveal() {
    setIsRevealing(true);
    try {
      const res = await fetch(`/api/rooms/${roomCode}/reveal`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to reveal");
      }
      await fetchRoom();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reveal winner");
    } finally {
      setIsRevealing(false);
    }
  }

  function handleBarLineChange(index: number, value: string) {
    setBarLines((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  async function handleSubmit() {
    const lines = barLines.map((l) => l.trimEnd()).filter((l) => l.trim().length > 0);
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

  function handleTapSubmission(submissionId: string) {
    setRankedIds((prev) => {
      const idx = prev.indexOf(submissionId);
      if (idx !== -1) return prev.filter((id) => id !== submissionId);
      return [...prev, submissionId];
    });
  }

  async function handleSubmitRankings() {
    if (rankedIds.length === 0) return;
    setIsSubmittingRanking(true);
    try {
      const rankings = rankedIds.map((id, i) => ({ submissionId: id, rankPosition: i + 1 }));
      const res = await fetch(`/api/rooms/${roomCode}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rankings }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to submit rankings");
      }
      setHasRanked(true);
      await fetchRoom();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit rankings");
    } finally {
      setIsSubmittingRanking(false);
    }
  }

  async function handleShare() {
    const url = getRoomUrl(roomCode);
    const challengerName = roomState?.participants.find((p) => p.isHost)?.nickname ?? "Someone";
    const shareText = `${challengerName} finished today's Rhyzzle. Think you can beat them? ${url}`;
    setCopyFailed(false);
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: "Rhyzzle challenge", text: shareText, url });
        return;
      }
    } catch {
      // Share sheet dismissed — fall through to clipboard
    }
    const ok = await copyToClipboard(shareText);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } else {
      setCopyFailed(true);
    }
  }

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

  const { status, beat, challenge, participants, submittedCount, totalCount, isHost, roomMode } = roomState;

  const myNickname = participantId
    ? participants.find((p) => p.id === participantId)?.nickname ?? null
    : null;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50">
      <nav className="flex items-center justify-between px-5 py-4 border-b border-zinc-900">
        <Link href="/" className="text-zinc-400 hover:text-white transition-colors text-sm">
          Rhyzzle
        </Link>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-zinc-500 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded-lg">
            {roomCode}
          </span>
          {roomMode === "CHALLENGE_LINK" ? (
            <span className={cn(
              "text-xs font-semibold px-2 py-1 rounded-full",
              roomState.isLocked ? "text-zinc-400 bg-zinc-900" : "text-green-400 bg-green-400/10"
            )}>
              {roomState.isLocked ? "Locked" : "Live"}
            </span>
          ) : (
            <RoomStatusBadge status={status} />
          )}
        </div>
      </nav>

      <div className="max-w-sm mx-auto px-5 py-6">

        {roomMode === "CHALLENGE_LINK" && (
          <ChallengeLinkView
            roomState={roomState}
            hasJoined={hasJoined}
            hasSubmitted={hasSubmitted}
            hasRanked={hasRanked}
            rankedIds={rankedIds}
            onTapSubmission={handleTapSubmission}
            onSubmitRankings={handleSubmitRankings}
            isSubmittingRanking={isSubmittingRanking}
            nickname={nickname}
            setNickname={setNickname}
            barLines={barLines}
            onBarLineChange={handleBarLineChange}
            handleJoin={handleJoin}
            isJoining={isJoining}
            handleSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            handleShare={handleShare}
            copied={copied}
            copyFailed={copyFailed}
            roomCode={roomCode}
          />
        )}

        {roomMode !== "CHALLENGE_LINK" && (
          <>
            {status === "LOBBY" && !hasJoined && (
              <GuestJoinView
                nickname={nickname}
                setNickname={setNickname}
                onJoin={handleJoin}
                isJoining={isJoining}
                participants={participants}
                beatTitle={beat.title}
                barCount={challenge.barCount}
              />
            )}

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
                copyFailed={copyFailed}
                onStart={handleStart}
                isStarting={isStarting}
              />
            )}

            {status === "WRITING" && !hasJoined && (
              <LateArrivalView status={status} />
            )}

            {status === "WRITING" && hasJoined && (
              <WritingView
                beat={beat}
                challenge={challenge}
                barLines={barLines}
                onLineChange={handleBarLineChange}
                hasSubmitted={hasSubmitted}
                isSubmitting={isSubmitting}
                onSubmit={handleSubmit}
                submittedCount={submittedCount}
                totalCount={totalCount}
                isHost={isHost}
                roomMode={roomMode}
                roomCode={roomCode}
                onStartVoting={handleStartVoting}
                isStartingVoting={isStartingVoting}
              />
            )}

            {status === "VOTING" && !hasJoined && (
              <LateArrivalView status={status} />
            )}

            {status === "VOTING" && hasJoined && (
              <VotingView
                challenge={challenge}
                submissions={roomState.submissions ?? []}
                rankedIds={rankedIds}
                onTapSubmission={handleTapSubmission}
                hasRanked={hasRanked}
                isSubmittingRanking={isSubmittingRanking}
                onSubmitRankings={handleSubmitRankings}
                isHost={isHost}
                onReveal={handleReveal}
                isRevealing={isRevealing}
                votedCount={roomState.votedCount ?? 0}
                totalCount={totalCount}
              />
            )}

            {status === "REVEAL" && (
              <RevealView
                challenge={challenge}
                submissions={roomState.submissions ?? []}
                onShare={handleShare}
                copied={copied}
                copyFailed={copyFailed}
              />
            )}

            {status === "CLOSED" && (
              <div className="text-center py-16">
                <div className="text-4xl mb-4">🏁</div>
                <h2 className="font-black text-xl mb-2">Room Closed</h2>
                <p className="text-zinc-500 text-sm mb-8">This room has ended.</p>
                <Link href="/play" className="block bg-amber-400 text-zinc-950 font-black py-4 rounded-2xl">
                  Play Today&apos;s Rhyzzle
                </Link>
              </div>
            )}
          </>
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

function GuestJoinView({
  nickname, setNickname, onJoin, isJoining, participants, beatTitle, barCount,
}: {
  nickname: string;
  setNickname: (v: string) => void;
  onJoin: () => void;
  isJoining: boolean;
  participants: RoomStateDTO["participants"];
  beatTitle: string;
  barCount: number;
}) {
  const hostName = participants.find((p) => p.isHost)?.nickname;
  return (
    <div className="space-y-6">
      <div className="text-center pt-4">
        {hostName ? (
          <>
            <p className="text-amber-400 text-xs font-black uppercase tracking-widest mb-2">Group Room</p>
            <h1 className="font-black text-2xl mb-1">{hostName}&apos;s room</h1>
          </>
        ) : (
          <h1 className="font-black text-2xl mb-2">Join the Room</h1>
        )}
        <p className="text-zinc-500 text-sm">{beatTitle} · {barCount} bars</p>
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

function LobbyView({
  roomCode, participants, isHost, myNickname, beat, challenge,
  onShare, copied, copyFailed, onStart, isStarting,
}: {
  roomCode: string;
  participants: RoomStateDTO["participants"];
  isHost: boolean;
  myNickname: string | null;
  beat: RoomStateDTO["beat"];
  challenge: RoomStateDTO["challenge"];
  onShare: () => void;
  copied: boolean;
  copyFailed: boolean;
  onStart: () => void;
  isStarting: boolean;
}) {
  return (
    <div className="space-y-5">
      <div className="pt-2">
        {isHost ? (
          <>
            <p className="text-xs text-amber-400 font-semibold uppercase tracking-widest mb-1">
              You&apos;re the host 👑
            </p>
            <h1 className="font-black text-2xl">Waiting for the crew</h1>
            <p className="text-zinc-500 text-sm mt-1">Share the link below. Start when everyone&apos;s in.</p>
          </>
        ) : (
          <>
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">
              {myNickname ? `You're in as ${myNickname}` : "You're in"}
            </p>
            <h1 className="font-black text-2xl">Waiting to start</h1>
            <p className="text-zinc-500 text-sm mt-1">The host will start the game when everyone&apos;s here.</p>
          </>
        )}
      </div>

      <button
        onClick={onShare}
        className={cn(
          "w-full py-4 rounded-2xl font-bold text-sm transition-all active:scale-95",
          isHost
            ? "bg-amber-400 text-zinc-950 hover:bg-amber-300"
            : "bg-zinc-900 border border-zinc-800 text-white hover:border-zinc-700"
        )}
      >
        {copied ? "✓ Copied link!" : "🔗 Send to Group Chat"}
      </button>
      {copyFailed && (
        <p className="text-xs text-zinc-500 text-center -mt-2">
          Couldn&apos;t auto-copy. Press and hold the link below to copy.
        </p>
      )}
      {copyFailed && (
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 select-all cursor-text">
          <p className="text-zinc-200 text-xs font-mono break-all">{getRoomUrl(roomCode)}</p>
        </div>
      )}

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
              <span className="font-semibold text-sm flex-1">{p.nickname}</span>
              {p.isHost && <span className="text-xs text-amber-400 font-semibold">host</span>}
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
  beat, challenge, barLines, onLineChange, hasSubmitted, isSubmitting, onSubmit,
  submittedCount, totalCount, isHost, roomMode, roomCode, onStartVoting, isStartingVoting,
}: {
  beat: RoomStateDTO["beat"];
  challenge: RoomStateDTO["challenge"];
  barLines: string[];
  onLineChange: (index: number, value: string) => void;
  hasSubmitted: boolean;
  isSubmitting: boolean;
  onSubmit: () => void;
  submittedCount: number;
  totalCount: number;
  isHost: boolean;
  roomMode: RoomStateDTO["roomMode"];
  roomCode: string;
  onStartVoting: () => void;
  isStartingVoting: boolean;
}) {
  const { barCount } = challenge;
  const filledCount = barLines.filter((l) => l.trim().length > 0).length;
  const isValid = barLines.length === barCount && barLines.every((l) => l.trim().length > 0);
  const isChallenge = roomMode === "CHALLENGE_LINK";
  const canStartVoting = isChallenge
    ? hasSubmitted && submittedCount >= 2
    : isHost && submittedCount >= 2;

  const [shareCopied, setShareCopied] = useState(false);
  const [shareCopyFailed, setShareCopyFailed] = useState(false);

  async function handleShareChallenge() {
    const url = getRoomUrl(roomCode);
    const text = `Think you can beat me? Write to the same beat and prompt. ${url}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "Rhyzzle challenge", text, url });
      } catch { /* dismissed */ }
      return;
    }
    const ok = await copyToClipboard(text);
    if (ok) {
      setShareCopied(true);
      setShareCopyFailed(false);
      setTimeout(() => setShareCopied(false), 2500);
    } else {
      setShareCopyFailed(true);
    }
  }

  if (hasSubmitted) {
    const pct = totalCount > 0 ? (submittedCount / totalCount) * 100 : 0;
    return (
      <div className="space-y-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-2xl">🔥</div>
            <div>
              <p className="font-black text-base text-white">Bars submitted!</p>
              <p className="text-zinc-500 text-sm">{submittedCount} / {totalCount} written</p>
            </div>
          </div>

          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-violet-500 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>

          {canStartVoting ? (
            <>
              <p className="text-xs text-green-400 font-semibold mb-3">
                {submittedCount >= totalCount
                  ? "Everyone's in — ready to rank!"
                  : `${submittedCount} submissions in. Rank who cooked.`}
              </p>
              <button
                onClick={onStartVoting}
                disabled={isStartingVoting}
                className="w-full bg-blue-500 text-white font-black text-base py-3.5 rounded-2xl hover:bg-blue-400 active:scale-95 transition-all disabled:opacity-50"
              >
                {isStartingVoting ? "Starting..." : "Start Voting →"}
              </button>
            </>
          ) : isChallenge ? (
            <p className="text-xs text-zinc-500">Voting unlocks after 2 people submit. Share the link below.</p>
          ) : isHost ? (
            <p className="text-xs text-zinc-600">Need at least 2 submissions to start voting.</p>
          ) : (
            <p className="text-xs text-zinc-600">Host will start voting when ready.</p>
          )}
        </div>

        {isChallenge && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <p className="text-xs text-zinc-500 font-black uppercase tracking-widest mb-1">Send to Group Chat</p>
            <p className="text-zinc-400 text-xs leading-relaxed mb-3">
              Friends write to the same beat and prompt. Then everyone ranks who cooked.
            </p>
            <div className="bg-zinc-800 rounded-xl px-3 py-2.5 mb-3">
              <p className="text-zinc-300 text-xs font-mono break-all">{getRoomUrl(roomCode)}</p>
            </div>
            <button
              onClick={handleShareChallenge}
              className="w-full bg-amber-400 text-zinc-950 font-black text-sm py-3 rounded-xl hover:bg-amber-300 active:scale-95 transition-all"
            >
              {shareCopied ? "✓ Link copied!" : "🔗 Send to Group Chat"}
            </button>
            {shareCopyFailed && (
              <p className="text-xs text-zinc-400 text-center mt-2">
                Couldn&apos;t copy — press and hold the link above to copy manually.
              </p>
            )}
          </div>
        )}

        <BeatPlayer beat={beat} />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 pb-36">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Writing Phase</span>
          </div>
          <span className="text-xs text-zinc-600 font-mono">{submittedCount} / {totalCount} submitted</span>
        </div>

        <BeatPlayer beat={beat} />

        {barLines.length === barCount ? (
          <LyricPuzzleCanvas
            challenge={challenge}
            lines={barLines}
            onLineChange={onLineChange}
            disabled={isSubmitting}
          />
        ) : (
          <div className="h-32 flex items-center justify-center">
            <p className="text-zinc-600 text-sm">Loading canvas...</p>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 inset-x-0 z-50 pointer-events-none">
        <div
          className="max-w-sm mx-auto px-5 pb-7 pt-6 pointer-events-auto"
          style={{ background: "linear-gradient(to top, rgb(9,9,11) 60%, rgba(9,9,11,0.85) 85%, transparent 100%)" }}
        >
          {!isValid && filledCount > 0 && (
            <p className="text-xs text-amber-400 text-center mb-2">
              {barCount - filledCount} more bar{barCount - filledCount !== 1 ? "s" : ""} needed
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
  challenge, submissions, rankedIds, onTapSubmission,
  hasRanked, isSubmittingRanking, onSubmitRankings,
  isHost, onReveal, isRevealing, votedCount, totalCount,
}: {
  challenge: RoomStateDTO["challenge"];
  submissions: NonNullable<RoomStateDTO["submissions"]>;
  rankedIds: string[];
  onTapSubmission: (id: string) => void;
  hasRanked: boolean;
  isSubmittingRanking: boolean;
  onSubmitRankings: () => void;
  isHost: boolean;
  onReveal: () => void;
  isRevealing: boolean;
  votedCount: number;
  totalCount: number;
}) {
  const canReveal = isHost && votedCount >= 1;
  const votableCount = submissions.filter((s) => !s.isOwnSubmission).length;

  const hostControls = isHost ? (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
      <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Host controls</p>
      <p className="text-xs text-zinc-400 mb-3">
        {votedCount} / {totalCount} ranked{votedCount >= totalCount ? " — everyone has voted!" : ""}
      </p>
      <button
        onClick={onReveal}
        disabled={!canReveal || isRevealing}
        className="w-full bg-amber-400 text-zinc-950 font-black text-base py-3.5 rounded-2xl hover:bg-amber-300 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isRevealing ? "Revealing..." : canReveal ? "Reveal Results 👑" : "Waiting for votes..."}
      </button>
    </div>
  ) : null;

  if (hasRanked) {
    return (
      <div className="space-y-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center">
          <div className="text-4xl mb-3">✓</div>
          <p className="font-black text-xl mb-1">Rankings submitted!</p>
          <p className="text-zinc-500 text-sm">
            {votedCount} / {totalCount} ranked — waiting for host to reveal...
          </p>
        </div>
        {hostControls}
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <div className="pt-1">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Voting Phase</span>
        </div>
        <h2 className="font-black text-2xl">Rank who cooked</h2>
        <p className="text-zinc-500 text-sm mt-1">
          Tap submissions in order — best first. Tap again to remove.
        </p>
      </div>

      {/* Rank progress indicator */}
      {rankedIds.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-zinc-500 font-semibold">Your ranking:</span>
          {rankedIds.map((id, i) => {
            const sub = submissions.find((s) => s.id === id);
            const label = sub
              ? submissions.filter(s => !s.isOwnSubmission).findIndex(s => s.id === id)
              : -1;
            const letter = label >= 0 ? String.fromCharCode(65 + label) : "?";
            return (
              <span
                key={id}
                className="text-xs font-black bg-violet-500/20 text-violet-300 border border-violet-500/30 px-2 py-0.5 rounded-full"
              >
                #{i + 1} {letter}
              </span>
            );
          })}
        </div>
      )}

      <div className="space-y-3">
        {submissions.map((sub, i) => {
          const isOwn = sub.isOwnSubmission ?? false;
          const rankIdx = rankedIds.indexOf(sub.id);
          const rankBadge = rankIdx !== -1 ? rankIdx + 1 : null;
          const label = isOwn ? "Your submission" : `Submission ${String.fromCharCode(65 + i)}`;
          return (
            <SubmissionPatternCard
              key={sub.id}
              challenge={challenge}
              lines={sub.lines}
              label={label}
              rankBadge={rankBadge}
              isOwn={isOwn}
              onClick={isOwn ? undefined : () => onTapSubmission(sub.id)}
            />
          );
        })}
      </div>

      <button
        onClick={onSubmitRankings}
        disabled={rankedIds.length === 0 || isSubmittingRanking || votableCount === 0}
        className={cn(
          "w-full font-black text-lg py-4 rounded-2xl transition-all active:scale-95",
          "bg-gradient-to-r from-blue-600 to-blue-500 text-white",
          "shadow-lg shadow-blue-900/40",
          "disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 disabled:shadow-none"
        )}
      >
        {isSubmittingRanking
          ? "Submitting..."
          : rankedIds.length === 0
          ? "Tap to rank submissions"
          : `Submit Rankings (${rankedIds.length} ranked)`}
      </button>

      <p className="text-xs text-zinc-600 text-center">
        You don&apos;t have to rank all submissions — rank as many as you want.
      </p>

      {hostControls}
    </div>
  );
}

function RevealView({
  challenge, submissions, onShare, copied, copyFailed,
}: {
  challenge: RoomStateDTO["challenge"];
  submissions: NonNullable<RoomStateDTO["submissions"]>;
  onShare: () => void;
  copied: boolean;
  copyFailed: boolean;
}) {
  const sorted = [...submissions].sort((a, b) => {
    const pa = a.finalPlacement ?? 999, pb = b.finalPlacement ?? 999;
    if (pa !== pb) return pa - pb;
    return (b.rankingPoints ?? 0) - (a.rankingPoints ?? 0);
  });

  const hasAnyVotes = submissions.some((s) => (s.rankingPoints ?? 0) > 0);
  const winners = sorted.filter((s) => s.isWinner);
  const isTie = winners.length > 1;

  return (
    <div className="space-y-5 pb-6">
      <div className="text-center pt-2">
        <div className="text-5xl mb-3">{!hasAnyVotes ? "📜" : isTie ? "🤝" : "👑"}</div>
        {!hasAnyVotes ? (
          <>
            <h2 className="font-black text-2xl">No rankings this round</h2>
            <p className="text-zinc-400 text-sm mt-1">All submissions below.</p>
          </>
        ) : isTie ? (
          <>
            <h2 className="font-black text-2xl">It&apos;s a tie!</h2>
            <p className="text-zinc-400 text-sm mt-1">
              {winners.map((w) => w.nickname).join(" & ")} — equal points
            </p>
          </>
        ) : (
          <>
            <h2 className="font-black text-2xl">{winners[0]?.nickname ?? "???"} cooked</h2>
            <p className="text-zinc-400 text-sm mt-1">
              {winners[0]?.rankingPoints ?? 0} ranking points
            </p>
          </>
        )}
      </div>

      {sorted.map((sub) => (
        <SubmissionPatternCard
          key={sub.id}
          challenge={challenge}
          lines={sub.lines}
          label={sub.nickname ?? "Anonymous"}
          placementBadge={hasAnyVotes ? (sub.finalPlacement ?? null) : null}
          rankingPoints={hasAnyVotes ? (sub.rankingPoints ?? 0) : undefined}
          isOwn={sub.isOwnSubmission}
        />
      ))}

      <div className="space-y-3 pt-2">
        <button
          onClick={onShare}
          className="w-full border border-zinc-700 text-zinc-300 font-semibold py-3.5 rounded-2xl hover:border-zinc-600 transition-all text-sm"
        >
          {copied ? "✓ Copied!" : "Share Results"}
        </button>
        {copyFailed && (
          <p className="text-xs text-zinc-500 text-center">
            Couldn&apos;t auto-copy — use the share sheet or copy manually.
          </p>
        )}
        <a
          href="/play"
          className="block w-full bg-amber-400 text-zinc-950 font-black py-3.5 rounded-2xl text-center text-base hover:bg-amber-300 transition-all active:scale-95"
        >
          Play Again →
        </a>
      </div>
    </div>
  );
}

function LateArrivalView({ status }: { status: RoomStateDTO["status"] }) {
  const isVoting = status === "VOTING";
  return (
    <div className="space-y-6 pt-4">
      <div className="text-center">
        <div className="text-4xl mb-3">{isVoting ? "🗳️" : "⛔"}</div>
        <h1 className="font-black text-2xl mb-2">
          {isVoting ? "Voting in progress" : "Game already started"}
        </h1>
        <p className="text-zinc-400 text-sm leading-relaxed max-w-xs mx-auto">
          {isVoting
            ? "This group room's vote has already started."
            : "This group room's game has already started. You can't join mid-game."}
        </p>
      </div>
      <Link
        href="/play"
        className="block w-full bg-amber-400 text-zinc-950 font-black text-lg py-4 rounded-2xl text-center hover:bg-amber-300 active:scale-95 transition-all"
      >
        Play Today&apos;s Rhyzzle →
      </Link>
      <Link href="/" className="block text-center text-zinc-600 text-sm hover:text-zinc-400 transition-colors py-1">
        ← Back Home
      </Link>
    </div>
  );
}

// ── CHALLENGE_LINK views ───────────────────────────────────────────────────────

function ChallengeLinkView({
  roomState, hasJoined, hasSubmitted, hasRanked,
  rankedIds, onTapSubmission, onSubmitRankings, isSubmittingRanking,
  nickname, setNickname, barLines, onBarLineChange,
  handleJoin, isJoining, handleSubmit, isSubmitting,
  handleShare, copied, copyFailed, roomCode,
}: {
  roomState: RoomStateDTO;
  hasJoined: boolean;
  hasSubmitted: boolean;
  hasRanked: boolean;
  rankedIds: string[];
  onTapSubmission: (id: string) => void;
  onSubmitRankings: () => void;
  isSubmittingRanking: boolean;
  nickname: string;
  setNickname: (v: string) => void;
  barLines: string[];
  onBarLineChange: (index: number, value: string) => void;
  handleJoin: () => void;
  isJoining: boolean;
  handleSubmit: () => void;
  isSubmitting: boolean;
  handleShare: () => void;
  copied: boolean;
  copyFailed: boolean;
  roomCode: string;
}) {
  const { isLocked, locksAt, beat, challenge, participants, submittedCount } = roomState;
  const hostNickname = participants.find((p) => p.isHost)?.nickname ?? null;
  const submissions = roomState.submissions ?? [];
  const lockTimeDisplay = locksAt ? formatLockTime(locksAt) : "9 PM";

  if (isLocked) {
    return <ChallengeFinalView challenge={challenge} submissions={submissions} onShare={handleShare} copied={copied} copyFailed={copyFailed} />;
  }

  if (!hasJoined) {
    return (
      <ChallengeLinkJoinView
        hostNickname={hostNickname}
        lockTimeDisplay={lockTimeDisplay}
        beat={beat}
        challenge={challenge}
        nickname={nickname}
        setNickname={setNickname}
        onJoin={handleJoin}
        isJoining={isJoining}
      />
    );
  }

  if (!hasSubmitted) {
    const { barCount } = challenge;
    const filledCount = barLines.filter((l) => l.trim().length > 0).length;
    const isValid = barLines.length === barCount && barLines.every((l) => l.trim().length > 0);
    return (
      <>
        <div className="space-y-4 pb-36">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Live Challenge</span>
            </div>
            <span className="text-xs text-amber-400 font-semibold bg-amber-400/10 px-2 py-1 rounded-full">
              Locks at {lockTimeDisplay}
            </span>
          </div>
          <BeatPlayer beat={beat} />
          {barLines.length === barCount ? (
            <LyricPuzzleCanvas
              challenge={challenge}
              lines={barLines}
              onLineChange={onBarLineChange}
              disabled={isSubmitting}
            />
          ) : (
            <div className="h-32 flex items-center justify-center">
              <p className="text-zinc-600 text-sm">Loading canvas...</p>
            </div>
          )}
        </div>
        <div className="fixed bottom-0 inset-x-0 z-50 pointer-events-none">
          <div
            className="max-w-sm mx-auto px-5 pb-7 pt-6 pointer-events-auto"
            style={{ background: "linear-gradient(to top, rgb(9,9,11) 60%, rgba(9,9,11,0.85) 85%, transparent 100%)" }}
          >
            {!isValid && filledCount > 0 && (
              <p className="text-xs text-amber-400 text-center mb-2">
                {barCount - filledCount} more bar{barCount - filledCount !== 1 ? "s" : ""} needed
              </p>
            )}
            <button
              onClick={handleSubmit}
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
              Submissions and voting are open until {lockTimeDisplay}.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <ChallengeLiveView
      challenge={challenge}
      submissions={submissions}
      rankedIds={rankedIds}
      onTapSubmission={onTapSubmission}
      hasRanked={hasRanked}
      isSubmittingRanking={isSubmittingRanking}
      onSubmitRankings={onSubmitRankings}
      lockTimeDisplay={lockTimeDisplay}
      roomCode={roomCode}
      submittedCount={submittedCount}
    />
  );
}

function ChallengeLinkJoinView({
  hostNickname, lockTimeDisplay, beat, challenge, nickname, setNickname, onJoin, isJoining,
}: {
  hostNickname: string | null;
  lockTimeDisplay: string;
  beat: RoomStateDTO["beat"];
  challenge: RoomStateDTO["challenge"];
  nickname: string;
  setNickname: (v: string) => void;
  onJoin: () => void;
  isJoining: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center pt-4">
        <div className="text-4xl mb-3">🎤</div>
        {hostNickname ? (
          <>
            <p className="text-amber-400 text-xs font-black uppercase tracking-widest mb-2">Challenge</p>
            <h1 className="font-black text-2xl leading-tight mb-1">{hostNickname} challenged you</h1>
          </>
        ) : (
          <h1 className="font-black text-2xl mb-1">Today&apos;s Rhyzzle</h1>
        )}
        <p className="text-zinc-400 text-sm mt-1">Submit your bars and rank before {lockTimeDisplay}.</p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-lg flex-shrink-0">🎵</div>
        <div>
          <p className="text-white font-semibold text-sm">{beat.title}</p>
          <p className="text-zinc-500 text-xs">{beat.bpm} BPM · {challenge.barCount} bars</p>
        </div>
        <span className="ml-auto text-xs text-green-400 font-semibold bg-green-400/10 px-2 py-1 rounded-full flex-shrink-0">
          Live until {lockTimeDisplay}
        </span>
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
          {isJoining ? "Joining..." : "Join Challenge →"}
        </button>
      </div>
    </div>
  );
}

function ChallengeLiveView({
  challenge, submissions, rankedIds, onTapSubmission, hasRanked,
  isSubmittingRanking, onSubmitRankings, lockTimeDisplay, roomCode, submittedCount,
}: {
  challenge: RoomStateDTO["challenge"];
  submissions: NonNullable<RoomStateDTO["submissions"]>;
  rankedIds: string[];
  onTapSubmission: (id: string) => void;
  hasRanked: boolean;
  isSubmittingRanking: boolean;
  onSubmitRankings: () => void;
  lockTimeDisplay: string;
  roomCode: string;
  submittedCount: number;
}) {
  const [shareCopied, setShareCopied] = useState(false);
  const [shareCopyFailed, setShareCopyFailed] = useState(false);
  const otherSubs = submissions.filter((s) => !s.isOwnSubmission);

  async function handleShareLink() {
    const url = getRoomUrl(roomCode);
    const text = `Can you beat me? Write to the same beat and prompt. ${url}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "Rhyzzle challenge", text, url });
      } catch { /* dismissed */ }
      return;
    }
    const ok = await copyToClipboard(text);
    if (ok) {
      setShareCopied(true);
      setShareCopyFailed(false);
      setTimeout(() => setShareCopied(false), 2500);
    } else {
      setShareCopyFailed(true);
    }
  }

  return (
    <div className="space-y-4 pb-4">
      {/* Live status */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <p className="font-black text-white">🔥 Bars submitted!</p>
          </div>
          <span className="text-xs text-amber-400 font-semibold bg-amber-400/10 px-2.5 py-1 rounded-full">
            Locks at {lockTimeDisplay}
          </span>
        </div>
        <p className="text-zinc-500 text-sm">
          {submittedCount > 1
            ? `${submittedCount} submissions in. Rank who cooked.`
            : "Waiting for challengers. Send the link."}
        </p>
        {submittedCount >= 2 && (
          <p className="text-xs text-zinc-600 mt-1">Rankings can change before {lockTimeDisplay}.</p>
        )}
      </div>

      {otherSubs.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center">
          <div className="text-3xl mb-3">⏳</div>
          <p className="font-semibold text-white mb-1">Waiting for challengers</p>
          <p className="text-zinc-500 text-sm">First one to submit gets the jump. Send the link.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Rank who cooked</p>
            </div>
            <p className="text-xs text-zinc-600">Tap in order — best first</p>
          </div>

          {/* Rank progress */}
          {rankedIds.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-zinc-500 font-semibold">Your ranking:</span>
              {rankedIds.map((id, i) => {
                const sub = submissions.find((s) => s.id === id);
                const idx = otherSubs.findIndex((s) => s.id === id);
                const letter = idx >= 0 ? String.fromCharCode(65 + idx) : "?";
                return (
                  <span
                    key={id}
                    className="text-xs font-black bg-violet-500/20 text-violet-300 border border-violet-500/30 px-2 py-0.5 rounded-full"
                  >
                    #{i + 1} {letter}
                  </span>
                );
              })}
            </div>
          )}

          {submissions.map((sub, i) => {
            const isOwn = sub.isOwnSubmission ?? false;
            const rankIdx = rankedIds.indexOf(sub.id);
            const rankBadge = rankIdx !== -1 ? rankIdx + 1 : null;
            const label = isOwn ? "Your submission" : `Submission ${String.fromCharCode(65 + i)}`;
            return (
              <SubmissionPatternCard
                key={sub.id}
                challenge={challenge}
                lines={sub.lines}
                label={label}
                rankBadge={rankBadge}
                isOwn={isOwn}
                onClick={isOwn ? undefined : () => onTapSubmission(sub.id)}
              />
            );
          })}

          <button
            onClick={onSubmitRankings}
            disabled={rankedIds.length === 0 || isSubmittingRanking}
            className={cn(
              "w-full font-black text-lg py-4 rounded-2xl transition-all active:scale-95",
              "bg-gradient-to-r from-blue-600 to-blue-500 text-white",
              "shadow-lg shadow-blue-900/40",
              "disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 disabled:shadow-none"
            )}
          >
            {isSubmittingRanking
              ? "Submitting..."
              : hasRanked
              ? `Change Rankings →`
              : rankedIds.length === 0
              ? "Tap to rank submissions"
              : `Submit Rankings (${rankedIds.length} ranked)`}
          </button>

          {hasRanked && (
            <p className="text-xs text-zinc-600 text-center">
              Rankings can change until results lock at {lockTimeDisplay}.
            </p>
          )}
        </div>
      )}

      {/* Share card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
        <p className="text-xs text-zinc-500 font-black uppercase tracking-widest mb-1">Send to Group Chat</p>
        <p className="text-zinc-400 text-xs leading-relaxed mb-3">
          More submissions = better battle. Link expires at {lockTimeDisplay}.
        </p>
        <div className="bg-zinc-800 rounded-xl px-3 py-2.5 mb-3">
          <p className="text-zinc-300 text-xs font-mono break-all">{getRoomUrl(roomCode)}</p>
        </div>
        <button
          onClick={handleShareLink}
          className="w-full bg-amber-400 text-zinc-950 font-black text-sm py-3 rounded-xl hover:bg-amber-300 active:scale-95 transition-all"
        >
          {shareCopied ? "✓ Link copied!" : "🔗 Send to Group Chat"}
        </button>
        {shareCopyFailed && (
          <p className="text-xs text-zinc-400 text-center mt-2">
            Couldn&apos;t copy — press and hold the link above to copy manually.
          </p>
        )}
      </div>
    </div>
  );
}

function ChallengeFinalView({
  challenge, submissions, onShare, copied, copyFailed,
}: {
  challenge: RoomStateDTO["challenge"];
  submissions: NonNullable<RoomStateDTO["submissions"]>;
  onShare: () => void;
  copied: boolean;
  copyFailed: boolean;
}) {
  const sorted = [...submissions].sort((a, b) => {
    const pa = a.finalPlacement ?? 999, pb = b.finalPlacement ?? 999;
    if (pa !== pb) return pa - pb;
    return (b.rankingPoints ?? 0) - (a.rankingPoints ?? 0);
  });

  const hasAnyVotes = submissions.some((s) => (s.rankingPoints ?? 0) > 0);
  const winners = sorted.filter((s) => s.isWinner);
  const isTie = winners.length > 1;
  const noVotes = !hasAnyVotes;

  return (
    <div className="space-y-5 pb-6">
      <div className="text-center pt-2">
        <p className="text-xs text-zinc-500 font-semibold uppercase tracking-widest mb-2">Final Results</p>
        <div className="text-5xl mb-3">{noVotes ? "📜" : isTie ? "🤝" : "👑"}</div>
        {noVotes ? (
          <>
            <h2 className="font-black text-2xl">No rankings this round</h2>
            <p className="text-zinc-400 text-sm mt-1">Results locked. All submissions below.</p>
          </>
        ) : isTie ? (
          <>
            <h2 className="font-black text-2xl">It&apos;s a tie!</h2>
            <p className="text-zinc-400 text-sm mt-1">
              {winners.map((w) => w.nickname).join(" & ")} — equal points
            </p>
          </>
        ) : (
          <>
            <h2 className="font-black text-2xl">{winners[0]?.nickname ?? "???"} cooked</h2>
            <p className="text-zinc-400 text-sm mt-1">
              {winners[0]?.rankingPoints ?? 0} ranking points
            </p>
          </>
        )}
      </div>

      {sorted.map((sub) => (
        <SubmissionPatternCard
          key={sub.id}
          challenge={challenge}
          lines={sub.lines}
          label={sub.nickname ?? "Anonymous"}
          placementBadge={hasAnyVotes ? (sub.finalPlacement ?? null) : null}
          rankingPoints={hasAnyVotes ? (sub.rankingPoints ?? 0) : undefined}
          isOwn={sub.isOwnSubmission}
        />
      ))}

      <div className="space-y-3 pt-2">
        <button
          onClick={onShare}
          className="w-full border border-zinc-700 text-zinc-300 font-semibold py-3.5 rounded-2xl hover:border-zinc-600 transition-all text-sm"
        >
          {copied ? "✓ Copied!" : "Copy Results"}
        </button>
        {copyFailed && (
          <p className="text-xs text-zinc-500 text-center">
            Couldn&apos;t auto-copy — use the share sheet or copy manually.
          </p>
        )}
        <Link
          href="/play"
          className="block w-full bg-amber-400 text-zinc-950 font-black py-3.5 rounded-2xl text-center text-base hover:bg-amber-300 transition-all active:scale-95"
        >
          Play Today&apos;s Rhyzzle →
        </Link>
        <Link
          href="/create"
          className="block w-full border border-zinc-800 text-zinc-400 font-semibold py-3.5 rounded-2xl text-center text-sm hover:border-zinc-700 hover:text-zinc-300 transition-all"
        >
          Start New Challenge
        </Link>
      </div>
    </div>
  );
}
