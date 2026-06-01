import { NextRequest, NextResponse } from "next/server";
import type { RoomStateDTO } from "@/lib/types";
import { SAMPLE_BEATS, SAMPLE_CHALLENGES, SAMPLE_ROOM } from "@/lib/sample-data";

// GET /api/rooms/[roomCode] — fetch current room state
// Returns phase-appropriate data:
//   LOBBY: participants list only
//   WRITING: beat, challenge, participant count — NO submission content
//   VOTING: anonymous submissions (no author names)
//   REVEAL: all submissions with author names + vote counts
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  try {
    const { roomCode } = await params;

    // TODO (Phase 1): Query DB for room by roomCode.
    // Include: beat, challenge (with rules + requiredWords), participants.
    // Apply phase-appropriate data filtering before returning.
    //
    // Example:
    //   const room = await prisma.room.findUnique({
    //     where: { roomCode },
    //     include: {
    //       beat: true,
    //       challenge: { include: { rules: true, requiredWords: true } },
    //       participants: true,
    //       submissions: room.status !== "WRITING" ? {
    //         include: { lines: true }
    //       } : false,
    //     }
    //   });

    // Placeholder: return the test room if roomCode matches, else 404
    if (roomCode !== SAMPLE_ROOM.roomCode) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const beat = SAMPLE_BEATS.find((b) => b.id === SAMPLE_ROOM.beatId)!;
    const challengeTemplate = SAMPLE_CHALLENGES.find(
      (c) => c.id === SAMPLE_ROOM.challengeId
    )!;

    const roomState: RoomStateDTO = {
      id: SAMPLE_ROOM.id,
      roomCode: SAMPLE_ROOM.roomCode,
      name: SAMPLE_ROOM.name,
      status: SAMPLE_ROOM.status,
      privacy: SAMPLE_ROOM.privacy,
      votingMode: SAMPLE_ROOM.votingMode,
      deadline: null,
      beat: {
        id: beat.id,
        title: beat.title,
        artist: beat.artist,
        audioUrl: beat.audioUrl,
        bpm: beat.bpm,
        genre: beat.genre,
        durationSec: beat.durationSec,
        coverUrl: beat.coverUrl,
        tags: beat.tags,
      },
      challenge: {
        id: challengeTemplate.id,
        title: challengeTemplate.title,
        description: challengeTemplate.description,
        barCount: challengeTemplate.barCount,
        rules: challengeTemplate.rules.map((r, i) => ({
          id: `rule-${i}`,
          type: r.type,
          lineIndex: r.lineIndex ?? null,
          targetLine: r.targetLine ?? null,
          rhymeScheme: r.rhymeScheme ?? null,
          theme: r.theme ?? null,
          description: r.description,
          sortOrder: i,
        })),
        requiredWords: (challengeTemplate.requiredWords ?? []).map((w, i) => ({
          id: `word-${i}`,
          word: w,
          sortOrder: i,
        })),
      },
      participants: [],
      submittedCount: 0,
      totalCount: 0,
      isHost: false,
    };

    return NextResponse.json(roomState);
  } catch (err) {
    console.error("[GET /api/rooms/[roomCode]]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
