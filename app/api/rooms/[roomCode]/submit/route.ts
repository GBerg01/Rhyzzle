import { NextRequest, NextResponse } from "next/server";
import type { SubmitBarsRequest, SubmitBarsResponse } from "@/lib/types";
import { prisma } from "@/lib/prisma";

// POST /api/rooms/[roomCode]/submit
// Saves a participant's bars. One submission per participant (enforced by DB unique constraint).
// CHALLENGE_LINK: allowed anytime before locksAt.
// GROUP_ROOM: allowed only in WRITING state.
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

    const room = await prisma.room.findUnique({
      where: { roomCode: upperCode },
      select: { id: true, status: true, roomMode: true, locksAt: true },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
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
      if (room.status !== "WRITING") {
        return NextResponse.json(
          { error: "Room is not in the writing phase" },
          { status: 400 }
        );
      }
    }

    // Verify participant is in this room
    const participant = await prisma.roomParticipant.findFirst({
      where: { id: participantCookie, roomId: room.id },
      select: { id: true },
    });
    if (!participant) {
      return NextResponse.json({ error: "You are not in this room" }, { status: 403 });
    }

    // Check not already submitted (DB unique constraint also enforces this)
    const existing = await prisma.submission.findUnique({
      where: { participantId: participantCookie },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ error: "You have already submitted" }, { status: 409 });
    }

    const rawText = body.lines.join("\n");

    const submission = await prisma.submission.create({
      data: {
        roomId: room.id,
        participantId: participantCookie,
        rawText,
        lines: {
          create: body.lines.map((text, idx) => ({ lineIndex: idx, text })),
        },
      },
      select: { id: true },
    });

    const response: SubmitBarsResponse = { submissionId: submission.id };
    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    console.error("[POST /api/rooms/[roomCode]/submit]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
