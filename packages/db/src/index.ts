import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

// Load root or package .env for scripts/tests (Next.js loads its own).
loadEnv({ path: resolve(process.cwd(), ".env") });
loadEnv({ path: resolve(process.cwd(), "../../.env") });
loadEnv({ path: resolve(process.cwd(), "packages/db/.env") });

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export { PrismaClient };
export type * from "@prisma/client";
export { withTenantRls, setTenantContext } from "./rls";
export {
  ROLE_KEYS,
  PERMISSIONS,
  SYSTEM_ROLES,
  ACTIVITY_CATEGORIES,
  ACTIVITY_STATUS,
  type RoleKey,
  type Permission,
  type RoleSeed,
  type ActivityCategory,
} from "./roles";
export { seedSystemRoles, ensureTenantRoles, seedDemoAdmin } from "./seed";

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
