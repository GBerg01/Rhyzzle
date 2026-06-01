import { NextRequest, NextResponse } from "next/server";
import type { CreateRoomRequest, CreateRoomResponse, RoomStateDTO } from "@/lib/types";
import { generateRoomCode, generateSessionToken } from "@/lib/utils";
import { saveRoom, roomExists } from "@/lib/room-store";
import { SAMPLE_BEATS, SAMPLE_CHALLENGES } from "@/lib/sample-data";

// POST /api/rooms — create a room and auto-join the creator as host
export async function POST(req: NextRequest) {
  try {
    const body: CreateRoomRequest = await req.json();

    if (!body.beatId || !body.challengeId) {
      return NextResponse.json(
        { error: "beatId and challengeId are required" },
        { status: 400 }
      );
    }

    if (!body.hostNickname?.trim()) {
      return NextResponse.json(
        { error: "hostNickname is required" },
        { status: 400 }
      );
    }

    const beat = SAMPLE_BEATS.find((b) => b.id === body.beatId);
    if (!beat) {
      return NextResponse.json({ error: "Beat not found" }, { status: 400 });
    }

    const challenge = SAMPLE_CHALLENGES.find((c) => c.id === body.challengeId);
    if (!challenge) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 400 });
    }

    // Generate unique room code
    let roomCode = generateRoomCode();
    let attempts = 0;
    while (roomExists(roomCode) && attempts < 10) {
      roomCode = generateRoomCode();
      attempts++;
    }

    const roomId = `room_${roomCode}`;
    const hostParticipantId = `p_${roomCode}_host`;
    const hostSessionToken = generateSessionToken();
    const hostNickname = body.hostNickname.trim().slice(0, 20);

    const hostParticipant = {
      id: hostParticipantId,
      nickname: hostNickname,
      isHost: true,
      joinedAt: new Date().toISOString(),
      hasSubmitted: false,
    };

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
      participants: [hostParticipant],
      submittedCount: 0,
      totalCount: 1,
      isHost: false,                       // always false in stored state; GET sets this per-requester
      currentParticipantId: null,          // always null in stored state; GET sets this per-requester
      currentParticipantHasSubmitted: false, // always false in stored state; GET sets this per-requester
    };

    saveRoom(roomCode, roomState);

    console.log(`[POST /api/rooms] Created ${roomCode} — host: ${hostNickname}`);

    const response: CreateRoomResponse = { roomCode, roomId, hostParticipantId };
    const nextResponse = NextResponse.json(response, { status: 201 });

    // Set session cookies so the room page recognises the host as already joined
    const cookieOpts = {
      httpOnly: true,
      sameSite: "lax" as const,
      maxAge: 60 * 60 * 24,
      path: "/",
    };
    nextResponse.cookies.set("rhyzzle_session", hostSessionToken, cookieOpts);
    nextResponse.cookies.set("rhyzzle_participant", hostParticipantId, cookieOpts);

    return nextResponse;
  } catch (err) {
    console.error("[POST /api/rooms]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
