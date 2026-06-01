import { NextRequest, NextResponse } from "next/server";
import type { JoinRoomRequest, JoinRoomResponse } from "@/lib/types";
import { generateSessionToken } from "@/lib/utils";
import { getRoom, updateRoom } from "@/lib/room-store";

// POST /api/rooms/[roomCode]/join
// Adds a participant to the room in the in-memory store (dev).
// Phase 1 DB: replace store calls with prisma.guestUser.create + prisma.roomParticipant.create
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  try {
    const { roomCode } = await params;
    const upperCode = roomCode.toUpperCase();
    const body: JoinRoomRequest = await req.json();

    if (!body.nickname || !body.nickname.trim()) {
      return NextResponse.json({ error: "Nickname is required" }, { status: 400 });
    }

    const room = getRoom(upperCode);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (room.status !== "LOBBY") {
      return NextResponse.json(
        { error: "Room is no longer accepting players" },
        { status: 400 }
      );
    }

    const nickname = body.nickname.trim().slice(0, 20);
    const sessionToken = generateSessionToken();
    const participantId = `p_${upperCode}_${Date.now()}`;
    const isFirstParticipant = room.participants.length === 0;

    // Add participant to room state
    const updatedParticipants = [
      ...room.participants,
      {
        id: participantId,
        nickname,
        isHost: isFirstParticipant,
        joinedAt: new Date().toISOString(),
        hasSubmitted: false,
      },
    ];

    updateRoom(upperCode, {
      participants: updatedParticipants,
      totalCount: updatedParticipants.length,
    });

    console.log(`[POST /api/rooms/${upperCode}/join] ${nickname} joined (isHost: ${isFirstParticipant})`);

    const response: JoinRoomResponse = {
      participantId,
      sessionToken,
      nickname,
      isHost: isFirstParticipant,
    };

    const nextResponse = NextResponse.json(response, { status: 201 });
    nextResponse.cookies.set("rhyzzle_session", sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });
    // Also store participantId so subsequent requests can identify this user
    nextResponse.cookies.set("rhyzzle_participant", participantId, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    return nextResponse;
  } catch (err) {
    console.error("[POST /api/rooms/[roomCode]/join]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
