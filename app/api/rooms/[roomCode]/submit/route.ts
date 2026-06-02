import { NextRequest, NextResponse } from "next/server";
import type { SubmitBarsRequest, SubmitBarsResponse, ChallengeDTO } from "@/lib/types";
import { prisma } from "@/lib/prisma";
import { runRuleChecks } from "@/lib/rule-checks/run-rule-checks";
import { CATEGORY_COLOR } from "@/lib/rule-checks/types";

// POST /api/rooms/[roomCode]/submit
// Saves a participant's bars. One submission per participant (enforced by DB unique constraint).
// Runs rule checks after saving and persists ConstraintResult + HighlightSpan rows.
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
      select: {
        id: true,
        status: true,
        roomMode: true,
        locksAt: true,
        challengeSnapshot: true,
      },
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

    // Create submission and capture line IDs for highlight span linking
    const submissionRecord = await prisma.submission.create({
      data: {
        roomId: room.id,
        participantId: participantCookie,
        rawText,
        lines: {
          create: body.lines.map((text, idx) => ({ lineIndex: idx, text })),
        },
      },
      select: {
        id: true,
        lines: { select: { id: true, lineIndex: true } },
      },
    });

    // Run rule checks (pure computation — no DB access)
    const challenge = room.challengeSnapshot as unknown as ChallengeDTO | null;
    if (challenge) {
      const { results, allHighlights } = runRuleChecks(body.lines, challenge);
      const lineIdByIndex = new Map(submissionRecord.lines.map((l) => [l.lineIndex, l.id]));

      // Persist rule check results — non-fatal (a bug here must not break submission)
      try {
        const spanData = allHighlights.flatMap((h) => {
          const submissionLineId = lineIdByIndex.get(h.lineIndex);
          if (!submissionLineId) return [];
          return [{
            submissionLineId,
            startIndex: h.startIndex,
            endIndex: h.endIndex,
            category: h.category,
            color: CATEGORY_COLOR[h.category] ?? h.category.toLowerCase(),
            confidence: h.confidence,
            explanation: h.explanation,
          }];
        });

        await Promise.all([
          results.length > 0
            ? prisma.constraintResult.createMany({
                data: results.map((r) => ({
                  submissionId: submissionRecord.id,
                  ruleType: r.ruleType,
                  lineIndex: r.lineIndex,
                  passed: r.status === "PASS",
                  confidence: r.confidence,
                  explanation: r.explanation,
                })),
              })
            : Promise.resolve(),
          spanData.length > 0
            ? prisma.highlightSpan.createMany({ data: spanData })
            : Promise.resolve(),
        ]);
      } catch (err) {
        // Non-fatal: rule checks failing must not prevent the submission from being recorded
        console.error("[submit] Rule check save failed (non-fatal):", err);
      }
    }

    const response: SubmitBarsResponse = { submissionId: submissionRecord.id };
    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    console.error("[POST /api/rooms/[roomCode]/submit]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
