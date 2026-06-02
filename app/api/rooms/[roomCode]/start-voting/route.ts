import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/rooms/[roomCode]/start-voting
// Transitions room from WRITING → VOTING. Requires at least 2 submissions.
//
// Authorization rules:
//   CHALLENGE_LINK rooms: live all day — no manual voting trigger needed.
//   GROUP_ROOM (and default): host only.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  try {
    const { roomCode } = await params;
    const upperCode = roomCode.toUpperCase();

    const participantCookie = req.cookies.get("rhyzzle_participant")?.value ?? null;
    if (!participantCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const room = await prisma.room.findUnique({
      where: { roomCode: upperCode },
      include: {
        participants: { where: { id: participantCookie } },
        _count: { select: { submissions: true } },
      },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const participant = room.participants[0] ?? null;
    if (!participant) {
      return NextResponse.json({ error: "You are not in this room" }, { status: 403 });
    }

    if (room.roomMode === "CHALLENGE_LINK") {
      return NextResponse.json(
        { message: "Challenge Links are live all day. Submit and vote anytime before results lock." },
        { status: 200 }
      );
    }

    if (!participant.isHost) {
      return NextResponse.json({ error: "Only the host can start voting" }, { status: 403 });
    }

    if (room.status !== "WRITING") {
      return NextResponse.json(
        { error: `Room is in ${room.status} state, not WRITING` },
        { status: 400 }
      );
    }

    if (room._count.submissions < 2) {
      return NextResponse.json(
        { error: "Need at least 2 submissions to start voting" },
        { status: 400 }
      );
    }

    const updated = await prisma.room.update({
      where: { id: room.id },
      data: { status: "VOTING" },
      select: { status: true },
    });

    return NextResponse.json({ status: updated.status });
  } catch (err) {
    console.error("[POST /api/rooms/[roomCode]/start-voting]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
