import { NextRequest, NextResponse } from "next/server";
import type { CastVoteRequest, CastVoteResponse } from "@/lib/types";
import { prisma } from "@/lib/prisma";

// POST /api/rooms/[roomCode]/vote
// Accepts ranked-choice vote: { rankings: [{ submissionId, rankPosition }] }
// CHALLENGE_LINK: rankings can be changed any time before locksAt (delete-and-recreate).
// GROUP_ROOM: one submission per VOTING phase; re-ranking returns 409.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  try {
    const { roomCode } = await params;
    const upperCode = roomCode.toUpperCase();
    const body: CastVoteRequest = await req.json();

    const { rankings } = body;
    if (!Array.isArray(rankings) || rankings.length === 0) {
      return NextResponse.json({ error: "rankings must be a non-empty array" }, { status: 400 });
    }

    const subIds = rankings.map((r) => r.submissionId);
    if (new Set(subIds).size !== subIds.length) {
      return NextResponse.json({ error: "Duplicate submissions in rankings" }, { status: 400 });
    }

    const positions = rankings.map((r) => r.rankPosition);
    if (new Set(positions).size !== positions.length) {
      return NextResponse.json({ error: "Duplicate rank positions in rankings" }, { status: 400 });
    }
    if (positions.some((p) => !Number.isInteger(p) || p < 1)) {
      return NextResponse.json({ error: "Rank positions must be positive integers" }, { status: 400 });
    }

    const participantCookie = req.cookies.get("rhyzzle_participant")?.value ?? null;
    if (!participantCookie) {
      return NextResponse.json({ error: "Not authenticated — join the room first" }, { status: 401 });
    }

    const room = await prisma.room.findUnique({
      where: { roomCode: upperCode },
      select: { id: true, status: true, roomMode: true, locksAt: true },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const participant = await prisma.roomParticipant.findFirst({
      where: { id: participantCookie, roomId: room.id },
      select: { id: true },
    });
    if (!participant) {
      return NextResponse.json({ error: "You are not in this room" }, { status: 403 });
    }

    if (room.roomMode === "CHALLENGE_LINK") {
      const isLocked = room.locksAt ? Date.now() >= room.locksAt.getTime() : false;
      if (isLocked) {
        return NextResponse.json(
          { error: "Today's Rhyzzle is locked. Final results are live." },
          { status: 400 }
        );
      }
    } else {
      if (room.status !== "VOTING") {
        return NextResponse.json({ error: "Room is not in the voting phase" }, { status: 400 });
      }
      // GROUP_ROOM: one ranking submission per participant
      const existingCount = await prisma.vote.count({
        where: { roomId: room.id, participantId: participantCookie },
      });
      if (existingCount > 0) {
        return NextResponse.json({ error: "You have already voted" }, { status: 409 });
      }
    }

    // Verify all submissions exist in this room and don't belong to the voter
    const submissionRecords = await prisma.submission.findMany({
      where: { id: { in: subIds }, roomId: room.id },
      select: { id: true, participantId: true },
    });

    if (submissionRecords.length !== subIds.length) {
      return NextResponse.json({ error: "One or more submissions not found in this room" }, { status: 404 });
    }

    const selfVote = submissionRecords.find((s) => s.participantId === participantCookie);
    if (selfVote) {
      return NextResponse.json({ error: "You cannot vote for your own submission" }, { status: 400 });
    }

    // Delete existing rankings and write new ones atomically
    await prisma.$transaction([
      prisma.vote.deleteMany({
        where: { roomId: room.id, participantId: participantCookie },
      }),
      prisma.vote.createMany({
        data: rankings.map((r) => ({
          roomId: room.id,
          submissionId: r.submissionId,
          participantId: participantCookie,
          rankPosition: r.rankPosition,
        })),
      }),
    ]);

    const response: CastVoteResponse = { success: true };
    return NextResponse.json(response);
  } catch (err) {
    console.error("[POST /api/rooms/[roomCode]/vote]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
