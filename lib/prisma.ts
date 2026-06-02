import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { __prisma: PrismaClient | undefined };

export const prisma: PrismaClient =
  globalForPrisma.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__prisma = prisma;
}
