import { NextRequest, NextResponse } from "next/server";
import type { CastVoteRequest, CastVoteResponse } from "@/lib/types";

// POST /api/rooms/[roomCode]/vote
// Records a participant's vote for a submission.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  try {
    const { roomCode } = await params;
    const body: CastVoteRequest = await req.json();

    if (!body.submissionId) {
      return NextResponse.json(
        { error: "submissionId is required" },
        { status: 400 }
      );
    }

    // Read session cookie to identify the voter
    const sessionId = req.cookies.get("rhyzzle_session")?.value;
    if (!sessionId) {
      return NextResponse.json(
        { error: "Not authenticated — join the room first" },
        { status: 401 }
      );
    }

    // TODO (Phase 2): Implement with Prisma:
    // 1. Find room by roomCode, verify status === "VOTING"
    // 2. Find GuestUser by sessionId, find their RoomParticipant
    // 3. Verify participant hasn't already voted (@@unique [submissionId, participantId])
    // 4. Verify submissionId belongs to this room
    // 5. Prevent voting for own submission
    // 6. Create Vote record
    // 7. Increment submission.votesCount
    // 8. Check if all participants have voted → auto-advance to REVEAL if so
    //
    // Example:
    //   const vote = await prisma.vote.create({
    //     data: { submissionId, participantId, guestUserId: guest.id }
    //   });
    //   await prisma.submission.update({
    //     where: { id: submissionId },
    //     data: { votesCount: { increment: 1 } }
    //   });

    const response: CastVoteResponse = { success: true };
    return NextResponse.json(response);
  } catch (err) {
    console.error("[POST /api/rooms/[roomCode]/vote]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
