import { NextRequest, NextResponse } from "next/server";
import { getRoom, updateRoom, getSubmissionsForRoom, hasParticipantSubmitted } from "@/lib/room-store";

// POST /api/rooms/[roomCode]/start-voting
// Transitions room from WRITING → VOTING. Requires at least 2 submissions.
//
// Authorization rules:
//   CHALLENGE_LINK rooms: any joined participant who has submitted can start voting.
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

    const room = getRoom(upperCode);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (room.status !== "WRITING") {
      return NextResponse.json(
        { error: `Room is in ${room.status} state, not WRITING` },
        { status: 400 }
      );
    }

    const participant = room.participants.find((p) => p.id === participantCookie);
    if (!participant) {
      return NextResponse.json({ error: "You are not in this room" }, { status: 403 });
    }

    if (room.roomMode === "CHALLENGE_LINK") {
      // Any submitted participant can start voting on a challenge link
      const submitted = hasParticipantSubmitted(upperCode, participantCookie);
      if (!submitted) {
        return NextResponse.json(
          { error: "You must submit your bars before starting the vote" },
          { status: 403 }
        );
      }
    } else {
      // GROUP_ROOM: host only
      if (!participant.isHost) {
        return NextResponse.json({ error: "Only the host can start voting" }, { status: 403 });
      }
    }

    const submissions = getSubmissionsForRoom(upperCode);
    if (submissions.length < 2) {
      return NextResponse.json(
        { error: "Need at least 2 submissions to start voting" },
        { status: 400 }
      );
    }

    const updated = updateRoom(upperCode, { status: "VOTING" });
    return NextResponse.json({ status: updated?.status });
  } catch (err) {
    console.error("[POST /api/rooms/[roomCode]/start-voting]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
