// In-memory room store for development — no database required.
// Uses a global variable so the Map survives Next.js hot-module reloads.
// Rooms reset when the dev server restarts, which is fine for local testing.
//
// When DATABASE_URL is configured and Phase 1 DB work is done,
// the API routes will replace calls to roomStore with prisma.room.findUnique().
// This file can then be deleted.

import type { RoomStateDTO } from "./types";

export interface StoredSubmission {
  submissionId: string;
  participantId: string;
  roomCode: string;
  lines: string[];
  rawText: string;
  submittedAt: string;
}

export interface StoredVote {
  voteId: string;
  participantId: string;
  submissionId: string;
  roomCode: string;
  votedAt: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __rhyzzleRooms: Map<string, RoomStateDTO> | undefined;
  // eslint-disable-next-line no-var
  var __rhyzzleSubmissions: Map<string, StoredSubmission> | undefined;
  // eslint-disable-next-line no-var
  var __rhyzzleVotes: Map<string, StoredVote> | undefined;
}

// Singleton Maps: survive HMR restarts in Next.js dev mode
const roomStore: Map<string, RoomStateDTO> =
  global.__rhyzzleRooms ?? (global.__rhyzzleRooms = new Map());

// Key: `${ROOMCODE}:${participantId}`
const submissionStore: Map<string, StoredSubmission> =
  global.__rhyzzleSubmissions ?? (global.__rhyzzleSubmissions = new Map());

// Key: `${ROOMCODE}:${participantId}` — one vote per participant per room
const voteStore: Map<string, StoredVote> =
  global.__rhyzzleVotes ?? (global.__rhyzzleVotes = new Map());

export function saveRoom(roomCode: string, room: RoomStateDTO): void {
  roomStore.set(roomCode.toUpperCase(), room);
}

export function getRoom(roomCode: string): RoomStateDTO | undefined {
  return roomStore.get(roomCode.toUpperCase());
}

export function roomExists(roomCode: string): boolean {
  return roomStore.has(roomCode.toUpperCase());
}

export function updateRoom(
  roomCode: string,
  patch: Partial<RoomStateDTO>
): RoomStateDTO | null {
  const existing = roomStore.get(roomCode.toUpperCase());
  if (!existing) return null;
  const updated = { ...existing, ...patch };
  roomStore.set(roomCode.toUpperCase(), updated);
  return updated;
}

export function listRooms(): RoomStateDTO[] {
  return Array.from(roomStore.values());
}

// ── Submission store ──────────────────────────────────────────────────────────

function submissionKey(roomCode: string, participantId: string): string {
  return `${roomCode.toUpperCase()}:${participantId}`;
}

export function saveSubmission(submission: StoredSubmission): void {
  submissionStore.set(submissionKey(submission.roomCode, submission.participantId), submission);
}

export function getSubmission(roomCode: string, participantId: string): StoredSubmission | undefined {
  return submissionStore.get(submissionKey(roomCode, participantId));
}

export function hasParticipantSubmitted(roomCode: string, participantId: string): boolean {
  return submissionStore.has(submissionKey(roomCode, participantId));
}

export function getSubmissionsForRoom(roomCode: string): StoredSubmission[] {
  const upper = roomCode.toUpperCase();
  return Array.from(submissionStore.values()).filter((s) => s.roomCode === upper);
}

// ── Vote store ────────────────────────────────────────────────────────────────

function voteKey(roomCode: string, participantId: string): string {
  return `${roomCode.toUpperCase()}:${participantId}`;
}

export function saveVote(vote: StoredVote): void {
  voteStore.set(voteKey(vote.roomCode, vote.participantId), vote);
}

export function hasParticipantVoted(roomCode: string, participantId: string): boolean {
  return voteStore.has(voteKey(roomCode, participantId));
}

export function getVotesForRoom(roomCode: string): StoredVote[] {
  const upper = roomCode.toUpperCase();
  return Array.from(voteStore.values()).filter((v) => v.roomCode === upper);
}

// Returns a map of submissionId → vote count for a given room
export function getVoteCountsForRoom(roomCode: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const v of getVotesForRoom(roomCode)) {
    counts.set(v.submissionId, (counts.get(v.submissionId) ?? 0) + 1);
  }
  return counts;
}
