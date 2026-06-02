import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/rooms/[roomCode]/start
// Host-only. Advances room from LOBBY → WRITING. Idempotent if already WRITING.
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
      include: { participants: { where: { id: participantCookie } } },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const participant = room.participants[0] ?? null;
    if (!participant?.isHost) {
      return NextResponse.json({ error: "Only the host can start the game" }, { status: 403 });
    }

    if (room.status !== "LOBBY") {
      return NextResponse.json({ status: room.status });
    }

    const updated = await prisma.room.update({
      where: { id: room.id },
      data: { status: "WRITING" },
      select: { status: true },
    });

    return NextResponse.json({ status: updated.status });
  } catch (err) {
    console.error("[POST /api/rooms/[roomCode]/start]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
