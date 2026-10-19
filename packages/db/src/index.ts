import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export { PrismaClient };
export type * from "@prisma/client";

/** Lightweight readiness probe for /api/ready. */
export async function checkDatabaseReady(): Promise<{
  ok: boolean;
  error?: string;
}> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown database error";
    return { ok: false, error: message };
  }
}
