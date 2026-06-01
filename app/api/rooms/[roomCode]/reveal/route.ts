import { NextRequest, NextResponse } from "next/server";
import { getRoom, updateRoom, getVotesForRoom } from "@/lib/room-store";

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

    const room = getRoom(upperCode);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const participant = room.participants.find((p) => p.id === participantCookie);
    if (!participant?.isHost) {
      return NextResponse.json({ error: "Only the host can reveal the winner" }, { status: 403 });
    }

    if (room.status !== "VOTING") {
      return NextResponse.json(
        { error: `Room is in ${room.status} state, not VOTING` },
        { status: 400 }
      );
    }

    const votes = getVotesForRoom(upperCode);
    if (votes.length === 0) {
      return NextResponse.json({ error: "No votes have been cast yet" }, { status: 400 });
    }

    const updated = updateRoom(upperCode, { status: "REVEAL" });
    return NextResponse.json({ status: updated?.status });
  } catch (err) {
    console.error("[POST /api/rooms/[roomCode]/reveal]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
