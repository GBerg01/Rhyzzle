import { PrismaClient } from "@prisma/client";
import { SAMPLE_BEATS, SAMPLE_CHALLENGES, SAMPLE_ROOM } from "../lib/sample-data";

const prisma = new PrismaClient();

async function main() {
  console.log("🎵 Seeding Rhyzzle database...");

  // Upsert beats
  for (const beat of SAMPLE_BEATS) {
    await prisma.beat.upsert({
      where: { id: beat.id },
      update: {},
      create: {
        id: beat.id,
        title: beat.title,
        artist: beat.artist,
        audioUrl: beat.audioUrl,
        bpm: beat.bpm,
        genre: beat.genre,
        durationSec: beat.durationSec,
        coverUrl: beat.coverUrl,
        tags: beat.tags,
        isPublic: true,
      },
    });
  }
  console.log(`✅ Seeded ${SAMPLE_BEATS.length} beats`);

  // Upsert challenges + rules + required words
  for (const challenge of SAMPLE_CHALLENGES) {
    await prisma.challenge.upsert({
      where: { id: challenge.id },
      update: {},
      create: {
        id: challenge.id,
        title: challenge.title,
        description: challenge.description,
        barCount: challenge.barCount,
        isTemplate: true,
        rules: {
          create: challenge.rules.map((rule, index) => ({
            type: rule.type,
            lineIndex: rule.lineIndex ?? null,
            targetLine: rule.targetLine ?? null,
            rhymeScheme: rule.rhymeScheme ?? null,
            theme: rule.theme ?? null,
            description: rule.description,
            sortOrder: index,
          })),
        },
        requiredWords: challenge.requiredWords
          ? {
              create: challenge.requiredWords.map((word, index) => ({
                word,
                sortOrder: index,
              })),
            }
          : undefined,
      },
    });
  }
  console.log(`✅ Seeded ${SAMPLE_CHALLENGES.length} challenge templates`);

  // Create a test room (only if it doesn't exist)
  const existingRoom = await prisma.room.findUnique({
    where: { roomCode: SAMPLE_ROOM.roomCode },
  });

  if (!existingRoom) {
    await prisma.room.create({
      data: {
        id: SAMPLE_ROOM.id,
        roomCode: SAMPLE_ROOM.roomCode,
        name: SAMPLE_ROOM.name,
        beatId: SAMPLE_ROOM.beatId,
        challengeId: SAMPLE_ROOM.challengeId,
        status: SAMPLE_ROOM.status,
        privacy: SAMPLE_ROOM.privacy,
        votingMode: SAMPLE_ROOM.votingMode,
      },
    });
    console.log(`✅ Created test room: /room/${SAMPLE_ROOM.roomCode}`);
  } else {
    console.log(`⏭️  Test room already exists: /room/${SAMPLE_ROOM.roomCode}`);
  }

  console.log("\n🚀 Database seeded successfully!");
  console.log(`   Beats: ${SAMPLE_BEATS.length}`);
  console.log(`   Challenge templates: ${SAMPLE_CHALLENGES.length}`);
  console.log(`   Test room: /room/${SAMPLE_ROOM.roomCode}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
