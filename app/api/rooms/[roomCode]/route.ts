import { NextRequest, NextResponse } from "next/server";
import {
  getRoom,
  hasParticipantSubmitted,
  hasParticipantVoted,
  getSubmissionsForRoom,
  getVoteCountsForRoom,
  getVotesForRoom,
  getVoteForParticipant,
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

    // Lock state — only meaningful for CHALLENGE_LINK rooms
    const locksAtStr = room.locksAt;
    const isLocked =
      room.roomMode === "CHALLENGE_LINK" && !!locksAtStr
        ? Date.now() >= new Date(locksAtStr).getTime()
        : false;

    // Which submission the current participant voted for (CHALLENGE_LINK: allow vote change)
    const currentParticipantVotedForId = currentParticipant
      ? (getVoteForParticipant(upperCode, currentParticipant.id)?.submissionId ?? null)
      : null;

    // Build submissions depending on room mode
    let submissions: SubmissionDTO[] | undefined;

    if (room.roomMode === "CHALLENGE_LINK") {
      // Challenge Links: always return submissions so the voting UI can show them.
      // Before locksAt: anonymous (no names, vote counts hidden).
      // After locksAt: full names and real vote counts (final results).
      const storedSubs = getSubmissionsForRoom(upperCode);
      if (storedSubs.length > 0) {
        const voteCounts = getVoteCountsForRoom(upperCode);
        let maxVotes = 0;
        if (isLocked) {
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
            participantId: isLocked ? sub.participantId : "",
            nickname: isLocked ? (participant?.nickname ?? null) : null,
            rawText: sub.rawText,
            lines: sub.lines.map((text, idx) => ({
              id: `${sub.submissionId}_line_${idx}`,
              lineIndex: idx,
              text,
              highlightSpans: [],
            })),
            voteCount: isLocked ? voteCount : 0, // hide counts during live voting (prevent bandwagon)
            isWinner: isLocked && maxVotes > 0 && voteCount === maxVotes,
            isOwnSubmission: isOwn,
            constraintResults: [],
          } satisfies SubmissionDTO;
        });
      }
    } else if (room.status === "VOTING" || room.status === "REVEAL") {
      // GROUP_ROOM: existing state-machine logic unchanged
      const storedSubs = getSubmissionsForRoom(upperCode);
      const voteCounts = getVoteCountsForRoom(upperCode);
      const isReveal = room.status === "REVEAL";

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
          participantId: isReveal ? sub.participantId : "",
          nickname: isReveal ? (participant?.nickname ?? null) : null,
          rawText: sub.rawText,
          lines: sub.lines.map((text, idx) => ({
            id: `${sub.submissionId}_line_${idx}`,
            lineIndex: idx,
            text,
            highlightSpans: [],
          })),
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
      currentParticipantVotedForId,
      votedCount,
      isLocked,
      submissions,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("[GET /api/rooms/[roomCode]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
