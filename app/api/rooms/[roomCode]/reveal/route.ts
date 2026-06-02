import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/rooms/[roomCode]/reveal
// Host-only. Transitions room from VOTING → REVEAL.
// At least one vote must exist to reveal (enforces voting happened).
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
        _count: { select: { votes: true } },
      },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const participant = room.participants[0] ?? null;
    if (!participant?.isHost) {
      return NextResponse.json({ error: "Only the host can reveal the winner" }, { status: 403 });
    }

    if (room.status !== "VOTING") {
      return NextResponse.json(
        { error: `Room is in ${room.status} state, not VOTING` },
        { status: 400 }
      );
    }

    if (room._count.votes === 0) {
      return NextResponse.json({ error: "No votes have been cast yet" }, { status: 400 });
    }

    const updated = await prisma.room.update({
      where: { id: room.id },
      data: { status: "REVEAL" },
      select: { status: true },
    });

    return NextResponse.json({ status: updated.status });
  } catch (err) {
    console.error("[POST /api/rooms/[roomCode]/reveal]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
