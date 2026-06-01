import { NextRequest, NextResponse } from "next/server";
import { getRoom, updateRoom } from "@/lib/room-store";

// POST /api/rooms/[roomCode]/start
// Host-only. Advances room from LOBBY → WRITING. Idempotent if already WRITING.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  try {
    const { roomCode } = await params;
    const upperCode = roomCode.toUpperCase();

    const room = getRoom(upperCode);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const participantCookie = req.cookies.get("rhyzzle_participant")?.value ?? null;
    const participant = participantCookie
      ? room.participants.find((p) => p.id === participantCookie) ?? null
      : null;

    if (!participant?.isHost) {
      return NextResponse.json({ error: "Only the host can start the game" }, { status: 403 });
    }

    if (room.status !== "LOBBY") {
      // Already started — idempotent
      return NextResponse.json({ status: room.status });
    }

    const updated = updateRoom(upperCode, { status: "WRITING" });
    return NextResponse.json({ status: updated?.status ?? "WRITING" });
  } catch (err) {
    console.error("[POST /api/rooms/[roomCode]/start]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
