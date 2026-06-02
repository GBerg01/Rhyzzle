import { NextRequest, NextResponse } from "next/server";
import type { CreateRoomRequest, CreateRoomResponse, RoomStateDTO, RoomMode } from "@/lib/types";
import { generateRoomCode, generateSessionToken, getDefaultLocksAt } from "@/lib/utils";
import { saveRoom, roomExists, saveSubmission } from "@/lib/room-store";
import { SAMPLE_BEATS, SAMPLE_CHALLENGES } from "@/lib/sample-data";
import { DAILY_BEAT, getDailyVariant, variantToChallengeDTO } from "@/lib/daily-challenge";
import type { DailyBarCount } from "@/lib/daily-challenge";

// POST /api/rooms — create a room and auto-join the creator as host.
//
// source: "DAILY_CHALLENGE" — group room from today's beat/prompt, starts in LOBBY
// source: "CHALLENGE_LINK"  — solo-play challenge, starts in WRITING, creator bars submitted
// (none)                    — legacy custom room with beatId + challengeId
export async function POST(req: NextRequest) {
  try {
    const body: CreateRoomRequest = await req.json();

    if (!body.hostNickname?.trim()) {
      return NextResponse.json({ error: "hostNickname is required" }, { status: 400 });
    }

    let beat: RoomStateDTO["beat"];
    let challenge: RoomStateDTO["challenge"];
    let initialStatus: RoomStateDTO["status"] = "LOBBY";
    let roomMode: RoomMode = "GROUP_ROOM";
    let locksAt: string | null = null;

    if (body.source === "DAILY_CHALLENGE" || body.source === "CHALLENGE_LINK") {
      const barCount = (body.barCount ?? 6) as DailyBarCount;
      if (![3, 6, 8].includes(barCount)) {
        return NextResponse.json({ error: "barCount must be 3, 6, or 8" }, { status: 400 });
      }

      const variant = getDailyVariant(barCount);
      const challengeDTO = variantToChallengeDTO(variant);

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
      challenge = challengeDTO;

      // Challenge links: live all day, no LOBBY, lock at 9 PM
      if (body.source === "CHALLENGE_LINK") {
        initialStatus = "WRITING"; // kept for backward compat with join API; lock state drives UI
        roomMode = "CHALLENGE_LINK";
        locksAt = getDefaultLocksAt();
      }
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

    // For challenge links, the creator has already submitted — mark them immediately
    const isChallengeLinkCreator = body.source === "CHALLENGE_LINK";

    const hostParticipant = {
      id: hostParticipantId,
      nickname: hostNickname,
      isHost: true,
      joinedAt: new Date().toISOString(),
      hasSubmitted: isChallengeLinkCreator,
    };

    const roomState: RoomStateDTO = {
      id: roomId,
      roomCode,
      name: body.name ?? null,
      status: initialStatus,
      privacy: body.privacy ?? "PRIVATE",
      votingMode: "ANONYMOUS",
      roomMode,
      deadline: body.deadline ?? null,
      locksAt,                              // null for GROUP_ROOM; 9 PM timestamp for CHALLENGE_LINK
      isLocked: false,                      // always false in stored state; GET recomputes from locksAt
      beat,
      challenge,
      participants: [hostParticipant],
      submittedCount: isChallengeLinkCreator ? 1 : 0,
      totalCount: 1,
      isHost: false,                        // always false in stored state; GET sets this per-requester
      currentParticipantId: null,           // always null in stored state; GET sets this per-requester
      currentParticipantHasSubmitted: false, // always false in stored state; GET sets this per-requester
      currentParticipantHasVoted: false,    // always false in stored state; GET sets this per-requester
      currentParticipantVotedForId: null,   // always null in stored state; GET sets this per-requester
      votedCount: 0,                        // always 0 in stored state; GET computes this live
    };

    saveRoom(roomCode, roomState);

    // For challenge links: immediately save the creator's bars as a submission
    if (isChallengeLinkCreator && Array.isArray(body.submittedBars) && body.submittedBars.length > 0) {
      const submittedLines = body.submittedBars.filter((l) => l.trim().length > 0);
      saveSubmission({
        submissionId: `sub_${roomCode}_${Date.now()}`,
        participantId: hostParticipantId,
        roomCode,
        lines: submittedLines,
        rawText: submittedLines.join("\n"),
        submittedAt: new Date().toISOString(),
      });
    }

    console.log(
      `[POST /api/rooms] Created ${roomCode} — host: ${hostNickname} source: ${body.source ?? "custom"} status: ${initialStatus}`
    );

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
