import { NextRequest, NextResponse } from "next/server";
import type { CreateRoomRequest, CreateRoomResponse, RoomStateDTO } from "@/lib/types";
import { generateRoomCode } from "@/lib/utils";
import { saveRoom, roomExists } from "@/lib/room-store";
import { SAMPLE_BEATS, SAMPLE_CHALLENGES } from "@/lib/sample-data";

// POST /api/rooms — create a new room
export async function POST(req: NextRequest) {
  try {
    const body: CreateRoomRequest = await req.json();

    if (!body.beatId || !body.challengeId) {
      return NextResponse.json(
        { error: "beatId and challengeId are required" },
        { status: 400 }
      );
    }

    // Validate beat exists
    const beat = SAMPLE_BEATS.find((b) => b.id === body.beatId);
    if (!beat) {
      console.error(`[POST /api/rooms] Unknown beatId: ${body.beatId}`);
      return NextResponse.json({ error: "Beat not found" }, { status: 400 });
    }

    // Validate challenge exists
    const challenge = SAMPLE_CHALLENGES.find((c) => c.id === body.challengeId);
    if (!challenge) {
      console.error(`[POST /api/rooms] Unknown challengeId: ${body.challengeId}`);
      return NextResponse.json({ error: "Challenge not found" }, { status: 400 });
    }

    // Generate a unique room code
    let roomCode = generateRoomCode();
    let attempts = 0;
    while (roomExists(roomCode) && attempts < 10) {
      roomCode = generateRoomCode();
      attempts++;
    }

    const roomId = `room_${roomCode}`;

    // Build full room state and persist it
    const roomState: RoomStateDTO = {
      id: roomId,
      roomCode,
      name: body.name ?? null,
      status: "LOBBY",
      privacy: body.privacy ?? "PRIVATE",
      votingMode: "ANONYMOUS",
      deadline: body.deadline ?? null,
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
        id: challenge.id,
        title: challenge.title,
        description: challenge.description,
        barCount: challenge.barCount,
        rules: challenge.rules.map((r, i) => ({
          id: `${challenge.id}_rule_${i}`,
          type: r.type,
          lineIndex: r.lineIndex ?? null,
          targetLine: r.targetLine ?? null,
          rhymeScheme: r.rhymeScheme ?? null,
          theme: r.theme ?? null,
          description: r.description,
          sortOrder: i,
        })),
        requiredWords: (challenge.requiredWords ?? []).map((w, i) => ({
          id: `${challenge.id}_word_${i}`,
          word: w,
          sortOrder: i,
        })),
      },
      participants: [],
      submittedCount: 0,
      totalCount: 0,
      isHost: false,
    };

    saveRoom(roomCode, roomState);

    console.log(`[POST /api/rooms] Created room ${roomCode} (beat: ${beat.title}, challenge: ${challenge.title})`);

    const response: CreateRoomResponse = { roomCode, roomId };
    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    console.error("[POST /api/rooms]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
