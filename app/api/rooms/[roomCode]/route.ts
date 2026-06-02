import { NextRequest, NextResponse } from "next/server";
import type {
  SubmissionDTO, RoomStateDTO, BeatDTO, ChallengeDTO,
  ParticipantDTO, RoomStatus, RoomPrivacy, VotingMode, RoomMode, RankingDTO,
} from "@/lib/types";
import { prisma } from "@/lib/prisma";
import { computePlacementResults } from "@/lib/utils";

// GET /api/rooms/[roomCode] — fetch current room state from DB.
// Returns phase-appropriate data:
//   WRITING: no submissions
//   VOTING: anonymous submissions (no names, vote counts hidden)
//   REVEAL: full submissions with names, placement data, Borda-count rankings
//   CHALLENGE_LINK: submissions always visible; names/placement revealed after locksAt
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  try {
    const { roomCode } = await params;
    const upperCode = roomCode.toUpperCase();

    const room = await prisma.room.findUnique({
      where: { roomCode: upperCode },
      include: {
        participants: { orderBy: { joinedAt: "asc" } },
        submissions: {
          orderBy: { createdAt: "asc" },
          include: { lines: { orderBy: { lineIndex: "asc" } } },
        },
        votes: true,
      },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const beat = room.beatSnapshot as unknown as BeatDTO;
    const challenge = room.challengeSnapshot as unknown as ChallengeDTO;

    if (!beat || !challenge) {
      return NextResponse.json({ error: "Room data is corrupted" }, { status: 500 });
    }

    const participantCookie = req.cookies.get("rhyzzle_participant")?.value ?? null;
    const currentParticipant = participantCookie
      ? room.participants.find((p) => p.id === participantCookie) ?? null
      : null;
    const currentParticipantId = currentParticipant?.id ?? null;

    const submittedParticipantIds = new Set(room.submissions.map((s) => s.participantId));

    // Group votes by voter (ranked voting: one voter = multiple vote rows)
    const byVoter = new Map<string, { submissionId: string; rankPosition: number }[]>();
    for (const v of room.votes) {
      if (!byVoter.has(v.participantId)) byVoter.set(v.participantId, []);
      byVoter.get(v.participantId)!.push({
        submissionId: v.submissionId,
        rankPosition: v.rankPosition,
      });
    }

    const votedCount = byVoter.size;

    const currentParticipantHasSubmitted = currentParticipantId
      ? submittedParticipantIds.has(currentParticipantId)
      : false;
    const currentParticipantHasVoted = currentParticipantId
      ? byVoter.has(currentParticipantId)
      : false;

    const currentParticipantRankings: RankingDTO[] = currentParticipantId
      ? (byVoter.get(currentParticipantId) ?? [])
          .slice()
          .sort((a, b) => a.rankPosition - b.rankPosition)
      : [];

    const isLocked =
      room.roomMode === "CHALLENGE_LINK" && !!room.locksAt
        ? Date.now() >= room.locksAt.getTime()
        : false;

    const participants: ParticipantDTO[] = room.participants.map((p) => ({
      id: p.id,
      nickname: p.nickname,
      isHost: p.isHost,
      joinedAt: p.joinedAt.toISOString(),
      hasSubmitted: submittedParticipantIds.has(p.id),
    }));

    // Compute Borda-count placements — only meaningful once there are votes
    const placements =
      room.votes.length > 0
        ? computePlacementResults(
            room.submissions.map((s) => ({ id: s.id })),
            room.votes.map((v) => ({
              submissionId: v.submissionId,
              participantId: v.participantId,
              rankPosition: v.rankPosition,
            })),
          )
        : [];
    const placementById = new Map(placements.map((p) => [p.submissionId, p]));

    let submissions: SubmissionDTO[] | undefined;

    if (room.roomMode === "CHALLENGE_LINK") {
      submissions = room.submissions.map((sub) => {
        const participant = room.participants.find((p) => p.id === sub.participantId);
        const isOwn = sub.participantId === currentParticipantId;
        const pl = placementById.get(sub.id);
        return {
          id: sub.id,
          participantId: isLocked ? sub.participantId : "",
          nickname: isLocked ? (participant?.nickname ?? null) : null,
          rawText: sub.rawText,
          lines: sub.lines.map((l) => ({
            id: l.id,
            lineIndex: l.lineIndex,
            text: l.text,
            highlightSpans: [],
          })),
          voteCount: isLocked ? (pl?.firstPlaceVotes ?? 0) : 0,
          isWinner: isLocked && (pl?.finalPlacement ?? 999) === 1 && (pl?.rankingPoints ?? 0) > 0,
          isOwnSubmission: isOwn,
          constraintResults: [],
          ...(isLocked && pl
            ? {
                rankingPoints: pl.rankingPoints,
                firstPlaceVotes: pl.firstPlaceVotes,
                averageRank: pl.averageRank,
                finalPlacement: pl.finalPlacement,
              }
            : {}),
        } satisfies SubmissionDTO;
      });
    } else if (room.status === "VOTING" || room.status === "REVEAL") {
      const isReveal = room.status === "REVEAL";
      submissions = room.submissions.map((sub) => {
        const participant = room.participants.find((p) => p.id === sub.participantId);
        const isOwn = sub.participantId === currentParticipantId;
        const pl = placementById.get(sub.id);
        return {
          id: sub.id,
          participantId: isReveal ? sub.participantId : "",
          nickname: isReveal ? (participant?.nickname ?? null) : null,
          rawText: sub.rawText,
          lines: sub.lines.map((l) => ({
            id: l.id,
            lineIndex: l.lineIndex,
            text: l.text,
            highlightSpans: [],
          })),
          voteCount: isReveal ? (pl?.firstPlaceVotes ?? 0) : 0,
          isWinner: isReveal && (pl?.finalPlacement ?? 999) === 1 && (pl?.rankingPoints ?? 0) > 0,
          isOwnSubmission: isOwn,
          constraintResults: [],
          ...(isReveal && pl
            ? {
                rankingPoints: pl.rankingPoints,
                firstPlaceVotes: pl.firstPlaceVotes,
                averageRank: pl.averageRank,
                finalPlacement: pl.finalPlacement,
              }
            : {}),
        } satisfies SubmissionDTO;
      });
    }

    const response: RoomStateDTO = {
      id: room.id,
      roomCode: room.roomCode,
      name: room.name,
      status: room.status as RoomStatus,
      privacy: room.privacy as RoomPrivacy,
      votingMode: room.votingMode as VotingMode,
      roomMode: room.roomMode as RoomMode,
      deadline: room.deadline?.toISOString() ?? null,
      locksAt: room.locksAt?.toISOString() ?? null,
      isLocked,
      beat,
      challenge,
      participants,
      submittedCount: room.submissions.length,
      totalCount: room.participants.length,
      isHost: currentParticipant?.isHost ?? false,
      currentParticipantId,
      currentParticipantHasSubmitted,
      currentParticipantHasVoted,
      currentParticipantRankings,
      votedCount,
      submissions,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("[GET /api/rooms/[roomCode]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
