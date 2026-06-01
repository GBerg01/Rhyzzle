import { NextRequest, NextResponse } from "next/server";
import type { CreateRoomRequest, CreateRoomResponse } from "@/lib/types";
import { generateRoomCode } from "@/lib/utils";

// POST /api/rooms — create a new room
// Phase 1: connect to database and persist room
export async function POST(req: NextRequest) {
  try {
    const body: CreateRoomRequest = await req.json();

    if (!body.beatId || !body.challengeId) {
      return NextResponse.json(
        { error: "beatId and challengeId are required" },
        { status: 400 }
      );
    }

    // TODO (Phase 1): Import PrismaClient, validate beatId + challengeId exist,
    // then create the Room in the database with a unique roomCode.
    // Example:
    //   const { PrismaClient } = await import("@prisma/client");
    //   const prisma = new PrismaClient();
    //   let roomCode: string;
    //   do { roomCode = generateRoomCode(); }
    //   while (await prisma.room.findUnique({ where: { roomCode } }));
    //   const room = await prisma.room.create({ data: { roomCode, beatId, challengeId, ... } });
    //   return NextResponse.json({ roomCode: room.roomCode, roomId: room.id });

    // Placeholder response for scaffolding phase
    const roomCode = generateRoomCode();
    const response: CreateRoomResponse = {
      roomCode,
      roomId: `placeholder-${roomCode}`,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    console.error("[POST /api/rooms]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
