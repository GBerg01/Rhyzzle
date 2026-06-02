import { NextRequest, NextResponse } from "next/server";
import type { JoinRoomRequest, JoinRoomResponse } from "@/lib/types";
import { generateSessionToken } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

// POST /api/rooms/[roomCode]/join
// Adds a participant to the room. Idempotent: if the participant cookie already
// matches a record in this room, returns success without creating a duplicate.
//
// Allowed states depend on roomMode:
//   LOBBY (any mode)          — always allowed
//   WRITING + CHALLENGE_LINK  — allowed (friend joining to write their bars)
//   VOTING  + CHALLENGE_LINK  — allowed (late spectator joining to vote)
//   everything else           — blocked with contextual error
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

    const room = await prisma.room.findUnique({
      where: { roomCode: upperCode },
      select: { id: true, status: true, roomMode: true },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Idempotency: if requester's cookie already points to a participant in this room, succeed early
    const participantCookie = req.cookies.get("rhyzzle_participant")?.value ?? null;
    const cookieOpts = { httpOnly: true, sameSite: "lax" as const, maxAge: 60 * 60 * 24, path: "/" };

    if (participantCookie) {
      const existing = await prisma.roomParticipant.findFirst({
        where: { id: participantCookie, roomId: room.id },
        select: { id: true, nickname: true, isHost: true },
      });
      if (existing) {
        const existingSession = req.cookies.get("rhyzzle_session")?.value ?? generateSessionToken();
        const response: JoinRoomResponse = {
          participantId: existing.id,
          sessionToken: existingSession,
          nickname: existing.nickname,
          isHost: existing.isHost,
        };
        const nextResponse = NextResponse.json(response, { status: 200 });
        nextResponse.cookies.set("rhyzzle_session", existingSession, cookieOpts);
        nextResponse.cookies.set("rhyzzle_participant", existing.id, cookieOpts);
        return nextResponse;
      }
    }

    const { status, roomMode } = room;
    const isChallenge = roomMode === "CHALLENGE_LINK";

    const canJoin =
      status === "LOBBY" ||
      (status === "WRITING" && isChallenge) ||
      (status === "VOTING" && isChallenge);

    if (!canJoin) {
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

    const { participant } = await prisma.$transaction(async (tx) => {
      const guest = await tx.guestUser.create({
        data: { nickname, sessionId: sessionToken },
      });
      const p = await tx.roomParticipant.create({
        data: {
          roomId: room.id,
          guestUserId: guest.id,
          nickname,
          isHost: false,
        },
      });
      return { participant: p, guestUser: guest };
    });

    console.log(
      `[POST /api/rooms/${upperCode}/join] ${nickname} joined in ${status} state`
    );

    const response: JoinRoomResponse = {
      participantId: participant.id,
      sessionToken,
      nickname,
      isHost: false,
    };

    const nextResponse = NextResponse.json(response, { status: 201 });
    nextResponse.cookies.set("rhyzzle_session", sessionToken, cookieOpts);
    nextResponse.cookies.set("rhyzzle_participant", participant.id, cookieOpts);

    return nextResponse;
  } catch (err) {
    console.error("[POST /api/rooms/[roomCode]/join]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
