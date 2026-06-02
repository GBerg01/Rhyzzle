import { NextRequest, NextResponse } from "next/server";
import type { CreateRoomRequest, CreateRoomResponse, BeatDTO, ChallengeDTO } from "@/lib/types";
import { generateRoomCode, generateSessionToken, getDefaultLocksAt } from "@/lib/utils";
import { SAMPLE_BEATS, SAMPLE_CHALLENGES } from "@/lib/sample-data";
import { DAILY_BEAT, getDailyVariant, variantToChallengeDTO } from "@/lib/daily-challenge";
import type { DailyBarCount } from "@/lib/daily-challenge";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

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

    let beat: BeatDTO;
    let challenge: ChallengeDTO;
    let initialStatus: "LOBBY" | "WRITING" = "LOBBY";
    let roomMode: "CHALLENGE_LINK" | "GROUP_ROOM" = "GROUP_ROOM";
    let locksAt: Date | null = null;

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

      if (body.source === "CHALLENGE_LINK") {
        initialStatus = "WRITING";
        roomMode = "CHALLENGE_LINK";
        locksAt = new Date(getDefaultLocksAt());
      }
    } else {
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

    // Generate unique room code (check DB for collisions)
    let roomCode = generateRoomCode();
    for (let i = 0; i < 10; i++) {
      const existing = await prisma.room.findUnique({
        where: { roomCode },
        select: { id: true },
      });
      if (!existing) break;
      roomCode = generateRoomCode();
    }

    const hostNickname = body.hostNickname.trim().slice(0, 20);
    const hostSessionToken = generateSessionToken();
    const isChallengeLinkCreator = body.source === "CHALLENGE_LINK";
    const submittedBars =
      isChallengeLinkCreator && Array.isArray(body.submittedBars)
        ? body.submittedBars.filter((l) => l.trim().length > 0)
        : [];

    const { room, participant, guestUser } = await prisma.$transaction(async (tx) => {
      const guest = await tx.guestUser.create({
        data: { nickname: hostNickname, sessionId: hostSessionToken },
      });

      const newRoom = await tx.room.create({
        data: {
          roomCode,
          name: body.name ?? null,
          // Explicitly null so Prisma uses RoomUncheckedCreateInput (raw FK path).
          // Snapshot-based rooms store beat/challenge data in JSON — no FK required.
          beatId: null,
          challengeId: null,
          beatSnapshot: beat as unknown as Prisma.InputJsonValue,
          challengeSnapshot: challenge as unknown as Prisma.InputJsonValue,
          status: initialStatus,
          roomMode,
          privacy: body.privacy ?? "PRIVATE",
          votingMode: "ANONYMOUS",
          locksAt,
          deadline: body.deadline ? new Date(body.deadline) : null,
          guestHostId: guest.id,
        },
      });

      const p = await tx.roomParticipant.create({
        data: {
          roomId: newRoom.id,
          guestUserId: guest.id,
          nickname: hostNickname,
          isHost: true,
        },
      });

      // For challenge links: immediately save the creator's bars
      if (isChallengeLinkCreator && submittedBars.length > 0) {
        await tx.submission.create({
          data: {
            roomId: newRoom.id,
            participantId: p.id,
            guestUserId: guest.id,
            rawText: submittedBars.join("\n"),
            lines: {
              create: submittedBars.map((text, idx) => ({ lineIndex: idx, text })),
            },
          },
        });
      }

      return { room: newRoom, participant: p, guestUser: guest };
    });

    console.log(
      `[POST /api/rooms] Created ${roomCode} — host: ${hostNickname} source: ${body.source ?? "custom"} status: ${initialStatus}`
    );

    const response: CreateRoomResponse = {
      roomCode,
      roomId: room.id,
      hostParticipantId: participant.id,
    };

    const nextResponse = NextResponse.json(response, { status: 201 });
    const cookieOpts = {
      httpOnly: true,
      sameSite: "lax" as const,
      maxAge: 60 * 60 * 24,
      path: "/",
    };
    nextResponse.cookies.set("rhyzzle_session", hostSessionToken, cookieOpts);
    nextResponse.cookies.set("rhyzzle_participant", participant.id, cookieOpts);

    return nextResponse;
  } catch (err) {
    console.error("[POST /api/rooms] Error:", err);

    if (err instanceof Error) {
      const code = (err as { code?: string }).code;

      // Prisma unique constraint (extremely rare: 10 room-code retries exhausted)
      if (code === "P2002") {
        return NextResponse.json(
          { error: "Room code collision — please try again" },
          { status: 500 }
        );
      }

      // Prisma DB connection failure (P1001 = unreachable, P1017 = closed)
      if (code === "P1001" || code === "P1017") {
        return NextResponse.json(
          { error: "Database connection failed — check the DB is running" },
          { status: 503 }
        );
      }

      // In development, surface the real message to make debugging faster
      if (process.env.NODE_ENV === "development") {
        return NextResponse.json(
          { error: `Server error: ${err.message}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to create challenge room — please try again" },
      { status: 500 }
    );
  }
}
