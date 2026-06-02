import { NextRequest, NextResponse } from "next/server";
import type { JoinRoomRequest, JoinRoomResponse } from "@/lib/types";
import { generateSessionToken } from "@/lib/utils";
import { getRoom, updateRoom } from "@/lib/room-store";

// POST /api/rooms/[roomCode]/join
// Adds a participant to the room. Allowed states depend on roomMode:
//
//   LOBBY (any mode)          — always allowed
//   WRITING + CHALLENGE_LINK  — allowed (friend joining to write their bars)
//   VOTING  + CHALLENGE_LINK  — allowed (late spectator joining to vote)
//   everything else           — blocked with contextual error
//
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

    const { status, roomMode } = room;
    const isChallenge = roomMode === "CHALLENGE_LINK";

    // Determine whether this join is allowed
    const canJoin =
      status === "LOBBY" ||
      (status === "WRITING" && isChallenge) ||
      (status === "VOTING" && isChallenge);

    if (!canJoin) {
      // Provide a contextual error so the client can render a useful screen
      if (status === "REVEAL" || status === "CLOSED") {
        return NextResponse.json(
          { error: "This round has ended.", roomStatus: status, roomMode },
          { status: 400 }
        );
      }
      if (isChallenge) {
        return NextResponse.json(
          { error: "Voting has already started — new bars are closed.", roomStatus: status, roomMode },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: "This group room's game has already started.", roomStatus: status, roomMode },
        { status: 400 }
      );
    }

    const nickname = body.nickname.trim().slice(0, 20);
    const sessionToken = generateSessionToken();
    const participantId = `p_${upperCode}_${Date.now()}`;
    const isFirstParticipant = room.participants.length === 0;

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

    console.log(
      `[POST /api/rooms/${upperCode}/join] ${nickname} joined in ${status} state (isHost: ${isFirstParticipant})`
    );

    const response: JoinRoomResponse = {
      participantId,
      sessionToken,
      nickname,
      isHost: isFirstParticipant,
    };

    const nextResponse = NextResponse.json(response, { status: 201 });
    const cookieOpts = { httpOnly: true, sameSite: "lax" as const, maxAge: 60 * 60 * 24, path: "/" };
    nextResponse.cookies.set("rhyzzle_session", sessionToken, cookieOpts);
    nextResponse.cookies.set("rhyzzle_participant", participantId, cookieOpts);

    return nextResponse;
  } catch (err) {
    console.error("[POST /api/rooms/[roomCode]/join]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
