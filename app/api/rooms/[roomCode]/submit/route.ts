import { NextRequest, NextResponse } from "next/server";
import {
  getRoom,
  updateRoom,
  saveSubmission,
  hasParticipantSubmitted,
} from "@/lib/room-store";
import type { SubmitBarsRequest, SubmitBarsResponse } from "@/lib/types";

// POST /api/rooms/[roomCode]/submit
// Saves a participant's bars. One submission per participant. Room must be in WRITING state.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  try {
    const { roomCode } = await params;
    const upperCode = roomCode.toUpperCase();
    const body: SubmitBarsRequest = await req.json();

    if (!Array.isArray(body.lines) || body.lines.length === 0) {
      return NextResponse.json({ error: "lines array is required" }, { status: 400 });
    }

    const participantCookie = req.cookies.get("rhyzzle_participant")?.value ?? null;
    if (!participantCookie) {
      return NextResponse.json(
        { error: "Not authenticated — join the room first" },
        { status: 401 }
      );
    }

    const room = getRoom(upperCode);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (room.roomMode === "CHALLENGE_LINK") {
      // Challenge links: allow submission anytime before locksAt
      const locksAt = room.locksAt;
      const isLocked = locksAt ? Date.now() >= new Date(locksAt).getTime() : false;
      if (isLocked) {
        return NextResponse.json(
          { error: "Today's Rhyzzle is locked. Final results are live." },
          { status: 400 }
        );
      }
    } else {
      // GROUP_ROOM: must be in WRITING state
      if (room.status !== "WRITING") {
        return NextResponse.json(
          { error: "Room is not in the writing phase" },
          { status: 400 }
        );
      }
    }

    const participant = room.participants.find((p) => p.id === participantCookie);
    if (!participant) {
      return NextResponse.json({ error: "You are not in this room" }, { status: 403 });
    }

    if (hasParticipantSubmitted(upperCode, participantCookie)) {
      return NextResponse.json({ error: "You have already submitted" }, { status: 409 });
    }

    const submissionId = `sub_${upperCode}_${Date.now()}`;
    const rawText = body.lines.join("\n");

    saveSubmission({
      submissionId,
      participantId: participantCookie,
      roomCode: upperCode,
      lines: body.lines,
      rawText,
      submittedAt: new Date().toISOString(),
    });

    // Update the participant's hasSubmitted flag and increment submittedCount
    const updatedParticipants = room.participants.map((p) =>
      p.id === participantCookie ? { ...p, hasSubmitted: true } : p
    );
    updateRoom(upperCode, {
      participants: updatedParticipants,
      submittedCount: room.submittedCount + 1,
    });

    const response: SubmitBarsResponse = { submissionId };
    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    console.error("[POST /api/rooms/[roomCode]/submit]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
