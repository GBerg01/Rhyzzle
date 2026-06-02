import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Tailwind class merging helper — use everywhere instead of plain clsx
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Room Codes ────────────────────────────────────────────────────────────

// Characters chosen to be unambiguous (no I, O, 0, 1)
const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_CODE_LENGTH = 5;

export function generateRoomCode(): string {
  let code = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  }
  return code;
}

// ─── Session Tokens ────────────────────────────────────────────────────────

export function generateSessionToken(): string {
  const array = new Uint8Array(32);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    // Node.js fallback
    const nodeCrypto = require("crypto") as typeof import("crypto");
    return nodeCrypto.randomBytes(32).toString("hex");
  }
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ─── Discovery Scoring ─────────────────────────────────────────────────────

interface EngagementCounts {
  likesCount: number;
  commentsCount: number;
  votesCount: number;
  sharesCount: number;
  savesCount: number;
}

export function calculateEngagementScore(counts: EngagementCounts): number {
  return (
    counts.likesCount * 1 +
    counts.commentsCount * 2 +
    counts.votesCount * 3 +
    counts.sharesCount * 4 +
    counts.savesCount * 3
  );
}

export function calculateHotScore(
  engagementScore: number,
  createdAt: Date
): number {
  const hoursSinceCreated =
    (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
  return engagementScore / Math.pow(hoursSinceCreated + 2, 1.3);
}

// ─── Formatting ────────────────────────────────────────────────────────────

export function formatBarCount(count: number): string {
  return `${count} bars`;
}

export function formatTimeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─── Challenge Link Lock Time ──────────────────────────────────────────────

/**
 * Returns the next 9 PM lock time as an ISO string.
 * Uses Node.js process timezone — set TZ env var for consistent server behavior
 * (e.g. TZ=America/New_York). Client displays in browser local time.
 * If 9 PM has already passed today, returns tomorrow at 9 PM.
 */
export function getDefaultLocksAt(): string {
  const now = new Date();
  const target = new Date(now);
  target.setHours(21, 0, 0, 0);
  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }
  return target.toISOString();
}

// ─── Room URL ─────────────────────────────────────────────────────────────

export function getRoomUrl(roomCode: string, baseUrl?: string): string {
  const base = baseUrl ?? (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/room/${roomCode}`;
}

// ─── Clipboard ────────────────────────────────────────────────────────────

// Safe clipboard helper — never throws. Returns true on success.
// Guards against: SSR, undefined navigator.clipboard, permission denial.
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  if (typeof navigator === "undefined" || !navigator.clipboard) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// ─── Ranked Voting — Borda Count ──────────────────────────────────────────────

export interface PlacementResult {
  submissionId: string;
  rankingPoints: number;
  firstPlaceVotes: number;
  averageRank: number | null;
  finalPlacement: number;
}

export function computePlacementResults(
  submissions: { id: string }[],
  votes: { submissionId: string; participantId: string; rankPosition: number }[],
): PlacementResult[] {
  const points = new Map<string, number>();
  const fpVotes = new Map<string, number>();
  const rankSums = new Map<string, number>();
  const rankCounts = new Map<string, number>();

  for (const s of submissions) {
    points.set(s.id, 0);
    fpVotes.set(s.id, 0);
    rankSums.set(s.id, 0);
    rankCounts.set(s.id, 0);
  }

  // Group votes by voter to determine N (how many each voter ranked)
  const byVoter = new Map<string, { submissionId: string; rankPosition: number }[]>();
  for (const v of votes) {
    if (!byVoter.has(v.participantId)) byVoter.set(v.participantId, []);
    byVoter.get(v.participantId)!.push({ submissionId: v.submissionId, rankPosition: v.rankPosition });
  }

  // Borda: voter ranked N submissions → rank k earns N - k + 1 points
  for (const [, voterRankings] of byVoter) {
    const N = voterRankings.length;
    for (const r of voterRankings) {
      points.set(r.submissionId, (points.get(r.submissionId) ?? 0) + (N - r.rankPosition + 1));
      rankSums.set(r.submissionId, (rankSums.get(r.submissionId) ?? 0) + r.rankPosition);
      rankCounts.set(r.submissionId, (rankCounts.get(r.submissionId) ?? 0) + 1);
      if (r.rankPosition === 1) {
        fpVotes.set(r.submissionId, (fpVotes.get(r.submissionId) ?? 0) + 1);
      }
    }
  }

  const sorted = [...submissions].sort((a, b) => {
    const pa = points.get(a.id) ?? 0, pb = points.get(b.id) ?? 0;
    if (pb !== pa) return pb - pa;
    return (fpVotes.get(b.id) ?? 0) - (fpVotes.get(a.id) ?? 0);
  });

  const results: PlacementResult[] = [];
  let placement = 1;
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0) {
      const curr = sorted[i], prev = sorted[i - 1];
      if (
        (points.get(curr.id) ?? 0) !== (points.get(prev.id) ?? 0) ||
        (fpVotes.get(curr.id) ?? 0) !== (fpVotes.get(prev.id) ?? 0)
      ) {
        placement = i + 1;
      }
    }
    const rc = rankCounts.get(sorted[i].id) ?? 0;
    results.push({
      submissionId: sorted[i].id,
      rankingPoints: points.get(sorted[i].id) ?? 0,
      firstPlaceVotes: fpVotes.get(sorted[i].id) ?? 0,
      averageRank: rc > 0 ? (rankSums.get(sorted[i].id) ?? 0) / rc : null,
      finalPlacement: placement,
    });
  }

  return results;
}

// ─── Highlight Colors ──────────────────────────────────────────────────────

import type { HighlightCategory } from "./types";

// Dark-background highlights (used in dark-themed cards / dark UIs)
export const HIGHLIGHT_COLORS: Record<HighlightCategory, { bg: string; text: string; label: string }> = {
  END_RHYME:          { bg: "bg-blue-500/20",   text: "text-blue-300",   label: "End Rhyme" },
  INTERNAL_RHYME:     { bg: "bg-purple-500/20", text: "text-purple-300", label: "Internal Rhyme" },
  ALLITERATION:       { bg: "bg-pink-500/20",   text: "text-pink-300",   label: "Alliteration" },
  ASSONANCE:          { bg: "bg-teal-500/20",   text: "text-teal-300",   label: "Assonance" },
  METAPHOR:           { bg: "bg-green-500/20",  text: "text-green-300",  label: "Metaphor" },
  PUNCHLINE:          { bg: "bg-yellow-500/20", text: "text-yellow-300", label: "Punchline" },
  DOUBLE_MEANING:     { bg: "bg-orange-500/20", text: "text-orange-300", label: "Double Meaning" },
  CALLBACK:           { bg: "bg-amber-800/20",  text: "text-amber-500",  label: "Callback" },
  REQUIRED_WORD:      { bg: "bg-transparent",   text: "text-white ring-1 ring-amber-400",             label: "Required Word" },
  FAILED_REQUIREMENT: { bg: "bg-transparent",   text: "text-white underline decoration-red-500",      label: "Failed Requirement" },
};

// Light-background highlights (used on white pattern board cards)
export const HIGHLIGHT_COLORS_LIGHT: Record<HighlightCategory, { className: string; label: string }> = {
  END_RHYME:          { className: "bg-blue-100 text-blue-800 rounded px-0.5",                              label: "End Rhyme" },
  INTERNAL_RHYME:     { className: "bg-cyan-100 text-cyan-800 rounded px-0.5",                              label: "Internal Rhyme" },
  ALLITERATION:       { className: "bg-orange-100 text-orange-800 rounded px-0.5",                          label: "Alliteration" },
  ASSONANCE:          { className: "bg-teal-100 text-teal-800 rounded px-0.5",                              label: "Assonance" },
  METAPHOR:           { className: "bg-green-100 text-green-800 rounded px-0.5",                            label: "Metaphor" },
  PUNCHLINE:          { className: "bg-purple-100 text-purple-800 rounded px-0.5",                          label: "Punchline" },
  DOUBLE_MEANING:     { className: "bg-orange-100 text-orange-800 rounded px-0.5",                          label: "Double Meaning" },
  CALLBACK:           { className: "bg-pink-100 text-pink-800 rounded px-0.5",                              label: "Callback" },
  REQUIRED_WORD:      { className: "bg-amber-100 text-amber-900 ring-1 ring-amber-400 rounded px-0.5",      label: "Required Word" },
  FAILED_REQUIREMENT: { className: "underline decoration-red-500 decoration-2 text-red-700",                label: "Missing" },
};
