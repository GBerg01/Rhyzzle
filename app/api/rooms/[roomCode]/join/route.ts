import { NextRequest, NextResponse } from "next/server";
import type { JoinRoomRequest, JoinRoomResponse } from "@/lib/types";
import { generateSessionToken } from "@/lib/utils";

// POST /api/rooms/[roomCode]/join
// Creates a GuestUser + RoomParticipant and sets a session cookie.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  try {
    const { roomCode } = await params;
    const body: JoinRoomRequest = await req.json();

    if (!body.nickname || !body.nickname.trim()) {
      return NextResponse.json(
        { error: "Nickname is required" },
        { status: 400 }
      );
    }

    const nickname = body.nickname.trim().slice(0, 20);

    // TODO (Phase 1): Implement with Prisma:
    // 1. Find room by roomCode, verify it exists and status === "LOBBY"
    // 2. Create GuestUser with { nickname, sessionId: generateSessionToken() }
    // 3. Create RoomParticipant with { roomId, guestUserId, nickname }
    // 4. Set session cookie: sessionId → ties future requests to this guest
    // 5. Return participantId + sessionToken + nickname + isHost
    //
    // Example:
    //   const room = await prisma.room.findUnique({ where: { roomCode } });
    //   if (!room || room.status !== "LOBBY") return 400;
    //   const sessionId = generateSessionToken();
    //   const guest = await prisma.guestUser.create({ data: { nickname, sessionId } });
    //   const participant = await prisma.roomParticipant.create({
    //     data: { roomId: room.id, guestUserId: guest.id, nickname, isHost: false }
    //   });
    //   const response = NextResponse.json({ participantId: participant.id, sessionToken: sessionId, nickname, isHost: false });
    //   response.cookies.set("rhyzzle_session", sessionId, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 });
    //   return response;

    // Placeholder response
    const sessionToken = generateSessionToken();
    const response: JoinRoomResponse = {
      participantId: `participant-placeholder-${roomCode}`,
      sessionToken,
      nickname,
      isHost: false,
    };

    const nextResponse = NextResponse.json(response, { status: 201 });
    nextResponse.cookies.set("rhyzzle_session", sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    return nextResponse;
  } catch (err) {
    console.error("[POST /api/rooms/[roomCode]/join]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
