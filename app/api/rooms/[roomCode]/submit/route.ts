import { NextRequest, NextResponse } from "next/server";
import type { SubmitBarsRequest, SubmitBarsResponse } from "@/lib/types";

// POST /api/rooms/[roomCode]/submit
// Saves a participant's bars to the database.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  try {
    const { roomCode } = await params;
    const body: SubmitBarsRequest = await req.json();

    if (!Array.isArray(body.lines) || body.lines.length === 0) {
      return NextResponse.json(
        { error: "lines array is required" },
        { status: 400 }
      );
    }

    // Read session cookie to identify the participant
    const sessionId = req.cookies.get("rhyzzle_session")?.value;
    if (!sessionId) {
      return NextResponse.json(
        { error: "Not authenticated — join the room first" },
        { status: 401 }
      );
    }

    // TODO (Phase 2): Implement with Prisma:
    // 1. Find room by roomCode, verify status === "WRITING"
    // 2. Find GuestUser by sessionId, find their RoomParticipant for this room
    // 3. Verify participant hasn't already submitted
    // 4. Create Submission + SubmissionLines
    // 5. Check if all participants have submitted → auto-advance to VOTING if so
    // 6. Return submissionId
    //
    // Example:
    //   const room = await prisma.room.findUnique({ where: { roomCode } });
    //   if (room?.status !== "WRITING") return 400;
    //   const guest = await prisma.guestUser.findUnique({ where: { sessionId } });
    //   const participant = await prisma.roomParticipant.findUnique({
    //     where: { roomId_guestUserId: { roomId: room.id, guestUserId: guest.id } }
    //   });
    //   const rawText = body.lines.join("\n");
    //   const submission = await prisma.submission.create({
    //     data: {
    //       roomId: room.id, participantId: participant.id,
    //       guestUserId: guest.id, rawText,
    //       lines: { create: body.lines.map((text, i) => ({ lineIndex: i, text })) }
    //     }
    //   });
    //   return NextResponse.json({ submissionId: submission.id });

    // Placeholder response
    const response: SubmitBarsResponse = {
      submissionId: `submission-placeholder-${roomCode}`,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    console.error("[POST /api/rooms/[roomCode]/submit]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
