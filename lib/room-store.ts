// In-memory room store for development — no database required.
// Uses a global variable so the Map survives Next.js hot-module reloads.
// Rooms reset when the dev server restarts, which is fine for local testing.
//
// When DATABASE_URL is configured and Phase 1 DB work is done,
// the API routes will replace calls to roomStore with prisma.room.findUnique().
// This file can then be deleted.

import type { RoomStateDTO } from "./types";

declare global {
  // eslint-disable-next-line no-var
  var __rhyzzleRooms: Map<string, RoomStateDTO> | undefined;
}

// Singleton Map: survives HMR restarts in Next.js dev mode
const roomStore: Map<string, RoomStateDTO> =
  global.__rhyzzleRooms ?? (global.__rhyzzleRooms = new Map());

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
