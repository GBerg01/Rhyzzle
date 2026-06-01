import { NextRequest, NextResponse } from "next/server";
import { getRoom } from "@/lib/room-store";

// GET /api/rooms/[roomCode] — fetch current room state
export async function GET(
  _req: NextRequest,
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

    console.log(`[GET /api/rooms/${upperCode}] Found — status: ${room.status}`);
    return NextResponse.json(room);
  } catch (err) {
    console.error("[GET /api/rooms/[roomCode]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
