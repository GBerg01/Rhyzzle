import { NextRequest, NextResponse } from "next/server";
import type { CreateRoomRequest, CreateRoomResponse, RoomStateDTO } from "@/lib/types";
import { generateRoomCode, generateSessionToken } from "@/lib/utils";
import { saveRoom, roomExists } from "@/lib/room-store";
import { SAMPLE_BEATS, SAMPLE_CHALLENGES } from "@/lib/sample-data";
import { DAILY_BEAT, getDailyVariant } from "@/lib/daily-challenge";
import type { DailyBarCount } from "@/lib/daily-challenge";

// POST /api/rooms — create a room and auto-join the creator as host
export async function POST(req: NextRequest) {
  try {
    const body: CreateRoomRequest = await req.json();

    if (!body.hostNickname?.trim()) {
      return NextResponse.json(
        { error: "hostNickname is required" },
        { status: 400 }
      );
    }

    let beat: RoomStateDTO["beat"];
    let challenge: RoomStateDTO["challenge"];

    if (body.source === "DAILY_CHALLENGE") {
      const barCount = (body.barCount ?? 6) as DailyBarCount;
      if (![3, 6, 8].includes(barCount)) {
        return NextResponse.json({ error: "barCount must be 3, 6, or 8" }, { status: 400 });
      }

      const variant = getDailyVariant(barCount);
      beat = {
        id: DAILY_BEAT.id,
        title: DAILY_BEAT.title,
        artist: DAILY_BEAT.artist,
        audioUrl: DAILY_BEAT.audioUrl,
        bpm: DAILY_BEAT.bpm,
        genre: DAILY_BEAT.genre,
        durationSec: DAILY_BEAT.durationSec,
        coverUrl: DAILY_BEAT.coverUrl,
        tags: DAILY_BEAT.tags,
      };
      challenge = {
        id: variant.id,
        title: variant.title,
        description: variant.description,
        barCount: variant.barCount,
        rules: variant.rules.map((r, i) => ({
          id: `${variant.id}_rule_${i}`,
          type: r.type,
          lineIndex: r.lineIndex ?? null,
          targetLine: r.targetLine ?? null,
          rhymeScheme: r.rhymeScheme ?? null,
          theme: r.theme ?? null,
          description: r.description,
          sortOrder: i,
        })),
        requiredWords: variant.requiredWords.map((w, i) => ({
          id: `${variant.id}_word_${i}`,
          word: w,
          sortOrder: i,
        })),
      };
    } else {
      // Legacy custom room path
      if (!body.beatId || !body.challengeId) {
        return NextResponse.json(
          { error: "beatId and challengeId are required for custom rooms" },
          { status: 400 }
        );
      }

      const sampleBeat = SAMPLE_BEATS.find((b) => b.id === body.beatId);
      if (!sampleBeat) {
        return NextResponse.json({ error: "Beat not found" }, { status: 400 });
      }

      const sampleChallenge = SAMPLE_CHALLENGES.find((c) => c.id === body.challengeId);
      if (!sampleChallenge) {
        return NextResponse.json({ error: "Challenge not found" }, { status: 400 });
      }

      beat = {
        id: sampleBeat.id,
        title: sampleBeat.title,
        artist: sampleBeat.artist,
        audioUrl: sampleBeat.audioUrl,
        bpm: sampleBeat.bpm,
        genre: sampleBeat.genre,
        durationSec: sampleBeat.durationSec,
        coverUrl: sampleBeat.coverUrl,
        tags: sampleBeat.tags,
      };
      challenge = {
        id: sampleChallenge.id,
        title: sampleChallenge.title,
        description: sampleChallenge.description,
        barCount: sampleChallenge.barCount,
        rules: sampleChallenge.rules.map((r, i) => ({
          id: `${sampleChallenge.id}_rule_${i}`,
          type: r.type,
          lineIndex: r.lineIndex ?? null,
          targetLine: r.targetLine ?? null,
          rhymeScheme: r.rhymeScheme ?? null,
          theme: r.theme ?? null,
          description: r.description,
          sortOrder: i,
        })),
        requiredWords: (sampleChallenge.requiredWords ?? []).map((w, i) => ({
          id: `${sampleChallenge.id}_word_${i}`,
          word: w,
          sortOrder: i,
        })),
      };
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
      beat,
      challenge,
      participants: [hostParticipant],
      submittedCount: 0,
      totalCount: 1,
      isHost: false,                        // always false in stored state; GET sets this per-requester
      currentParticipantId: null,           // always null in stored state; GET sets this per-requester
      currentParticipantHasSubmitted: false, // always false in stored state; GET sets this per-requester
      currentParticipantHasVoted: false,    // always false in stored state; GET sets this per-requester
      votedCount: 0,                        // always 0 in stored state; GET computes this live
    };

    saveRoom(roomCode, roomState);

    console.log(`[POST /api/rooms] Created ${roomCode} — host: ${hostNickname} source: ${body.source ?? "custom"}`);

    const response: CreateRoomResponse = { roomCode, roomId, hostParticipantId };
    const nextResponse = NextResponse.json(response, { status: 201 });

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
