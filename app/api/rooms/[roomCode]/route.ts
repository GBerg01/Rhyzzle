import { NextRequest, NextResponse } from "next/server";
import { getRoom } from "@/lib/room-store";

// GET /api/rooms/[roomCode] — fetch current room state
// Reads rhyzzle_participant cookie to identify the requester and set isHost/currentParticipantId.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  try {
    const { roomCode } = await params;
    const upperCode = roomCode.toUpperCase();

    const room = getRoom(upperCode);
    if (!room) {
      console.log(`[GET /api/rooms/${upperCode}] Not found`);
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Identify the requester from their session cookie
    const participantCookie = req.cookies.get("rhyzzle_participant")?.value ?? null;
    const currentParticipant = participantCookie
      ? room.participants.find((p) => p.id === participantCookie) ?? null
      : null;

    const response = {
      ...room,
      currentParticipantId: currentParticipant?.id ?? null,
      isHost: currentParticipant?.isHost ?? false,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("[GET /api/rooms/[roomCode]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
