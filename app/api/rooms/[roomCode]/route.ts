import { NextRequest, NextResponse } from "next/server";
import {
  getRoom,
  hasParticipantSubmitted,
  hasParticipantVoted,
  getSubmissionsForRoom,
  getVoteCountsForRoom,
  getVotesForRoom,
} from "@/lib/room-store";
import type { SubmissionDTO, RoomStateDTO } from "@/lib/types";

// GET /api/rooms/[roomCode] — fetch current room state
// Returns phase-appropriate data:
//   WRITING: no submissions
//   VOTING: anonymous submissions (no names, no vote counts)
//   REVEAL: full submissions with names and vote counts, winner marked
export async function GET(
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

    // Identify the requester from their session cookie
    const participantCookie = req.cookies.get("rhyzzle_participant")?.value ?? null;
    const currentParticipant = participantCookie
      ? room.participants.find((p) => p.id === participantCookie) ?? null
      : null;

    const currentParticipantHasSubmitted = currentParticipant
      ? hasParticipantSubmitted(upperCode, currentParticipant.id)
      : false;

    const currentParticipantHasVoted = currentParticipant
      ? hasParticipantVoted(upperCode, currentParticipant.id)
      : false;

    // Voted count — how many unique participants have voted
    const votes = getVotesForRoom(upperCode);
    const votedCount = votes.length;

    // Build submissions for VOTING and REVEAL states
    let submissions: SubmissionDTO[] | undefined;
    if (room.status === "VOTING" || room.status === "REVEAL") {
      const storedSubs = getSubmissionsForRoom(upperCode);
      const voteCounts = getVoteCountsForRoom(upperCode);
      const isReveal = room.status === "REVEAL";

      // In REVEAL, find the max vote count to mark winners
      let maxVotes = 0;
      if (isReveal) {
        for (const [, count] of voteCounts) {
          if (count > maxVotes) maxVotes = count;
        }
      }

      submissions = storedSubs.map((sub) => {
        const participant = room.participants.find((p) => p.id === sub.participantId);
        const isOwn = sub.participantId === currentParticipant?.id;
        const voteCount = voteCounts.get(sub.submissionId) ?? 0;

        return {
          id: sub.submissionId,
          // Anonymize during voting; reveal identity at REVEAL
          participantId: isReveal ? sub.participantId : "",
          nickname: isReveal ? (participant?.nickname ?? null) : null,
          rawText: sub.rawText,
          lines: sub.lines.map((text, idx) => ({
            id: `${sub.submissionId}_line_${idx}`,
            lineIndex: idx,
            text,
            highlightSpans: [],
          })),
          // Hide vote counts during voting to prevent bandwagon effect
          voteCount: isReveal ? voteCount : 0,
          isWinner: isReveal && maxVotes > 0 && voteCount === maxVotes,
          isOwnSubmission: isOwn,
          constraintResults: [],
        } satisfies SubmissionDTO;
      });
    }

    const response: RoomStateDTO = {
      ...room,
      currentParticipantId: currentParticipant?.id ?? null,
      isHost: currentParticipant?.isHost ?? false,
      currentParticipantHasSubmitted,
      currentParticipantHasVoted,
      votedCount,
      submissions,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("[GET /api/rooms/[roomCode]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
