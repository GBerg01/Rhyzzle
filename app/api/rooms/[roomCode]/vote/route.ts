import { NextRequest, NextResponse } from "next/server";
import {
  getRoom,
  getSubmissionsForRoom,
  hasParticipantVoted,
  saveVote,
} from "@/lib/room-store";
import type { CastVoteRequest, CastVoteResponse } from "@/lib/types";

// POST /api/rooms/[roomCode]/vote
// Records a participant's vote for a submission.
// Constraints: room must be VOTING, participant must be in room,
// cannot vote for own submission, cannot vote twice.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  try {
    const { roomCode } = await params;
    const upperCode = roomCode.toUpperCase();
    const body: CastVoteRequest = await req.json();

    if (!body.submissionId) {
      return NextResponse.json({ error: "submissionId is required" }, { status: 400 });
    }

    const participantCookie = req.cookies.get("rhyzzle_participant")?.value ?? null;
    if (!participantCookie) {
      return NextResponse.json({ error: "Not authenticated — join the room first" }, { status: 401 });
    }

    const room = getRoom(upperCode);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (room.status !== "VOTING") {
      return NextResponse.json({ error: "Room is not in the voting phase" }, { status: 400 });
    }

    const participant = room.participants.find((p) => p.id === participantCookie);
    if (!participant) {
      return NextResponse.json({ error: "You are not in this room" }, { status: 403 });
    }

    if (hasParticipantVoted(upperCode, participantCookie)) {
      return NextResponse.json({ error: "You have already voted" }, { status: 409 });
    }

    // Verify the submission exists in this room and doesn't belong to the voter
    const submissions = getSubmissionsForRoom(upperCode);
    const target = submissions.find((s) => s.submissionId === body.submissionId);
    if (!target) {
      return NextResponse.json({ error: "Submission not found in this room" }, { status: 404 });
    }
    if (target.participantId === participantCookie) {
      return NextResponse.json({ error: "You cannot vote for your own submission" }, { status: 400 });
    }

    saveVote({
      voteId: `vote_${upperCode}_${Date.now()}`,
      participantId: participantCookie,
      submissionId: body.submissionId,
      roomCode: upperCode,
      votedAt: new Date().toISOString(),
    });

    const response: CastVoteResponse = { success: true };
    return NextResponse.json(response);
  } catch (err) {
    console.error("[POST /api/rooms/[roomCode]/vote]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
