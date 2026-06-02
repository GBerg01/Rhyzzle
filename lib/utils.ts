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

// ─── Highlight Colors ──────────────────────────────────────────────────────

import type { HighlightCategory } from "./types";

export const HIGHLIGHT_COLORS: Record<HighlightCategory, { bg: string; text: string; label: string }> = {
  END_RHYME: { bg: "bg-blue-500/20", text: "text-blue-300", label: "End Rhyme" },
  INTERNAL_RHYME: { bg: "bg-purple-500/20", text: "text-purple-300", label: "Internal Rhyme" },
  ALLITERATION: { bg: "bg-pink-500/20", text: "text-pink-300", label: "Alliteration" },
  ASSONANCE: { bg: "bg-teal-500/20", text: "text-teal-300", label: "Assonance" },
  METAPHOR: { bg: "bg-green-500/20", text: "text-green-300", label: "Metaphor" },
  PUNCHLINE: { bg: "bg-yellow-500/20", text: "text-yellow-300", label: "Punchline" },
  DOUBLE_MEANING: { bg: "bg-orange-500/20", text: "text-orange-300", label: "Double Meaning" },
  CALLBACK: { bg: "bg-amber-800/20", text: "text-amber-500", label: "Callback" },
  REQUIRED_WORD: { bg: "bg-transparent", text: "text-white ring-1 ring-amber-400", label: "Required Word" },
  FAILED_REQUIREMENT: { bg: "bg-transparent", text: "text-white underline decoration-red-500", label: "Failed Requirement" },
};
